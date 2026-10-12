import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import User from './models/User.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import Society from './models/Society.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const runPhase6Tests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 6 COMMUNITY INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition, desc) => {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  };

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment.');
    process.exit(1);
  }

  // 1. Connect to MongoDB Atlas
  console.log('[1/8] Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  assert(mongoose.connection.readyState === 1, 'MongoDB Atlas connected');

  // 2. Mount ephemeral server with Auth and Community routes
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/community', communityRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`  - Test server mounted at ${baseUrl}\n`);

  const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const testStamp = Date.now();
  const userAEmail = `comm_user_a_${testStamp}@petly.com`;
  const userBEmail = `comm_user_b_${testStamp}@petly.com`;
  const password = 'StrongPassword123!';

  let tokenA = null;
  let tokenB = null;
  let userAId = null;
  let userBId = null;
  let postId = null;
  let commentId = null;
  let testSocietyId = null;
  let hamsterPostId = null;

  try {
    // 3. Setup Test Users
    console.log('[2/8] Setting up Test Identities (User A & User B)...');
    const signupA = await apiCall('/auth/signup', 'POST', {
      fullName: 'Author User A',
      email: userAEmail,
      password,
    });
    assert(signupA.status === 201, 'Created User A (Post Author)');
    tokenA = signupA.data.token;
    userAId = signupA.data.user._id;

    const signupB = await apiCall('/auth/signup', 'POST', {
      fullName: 'Commenter User B',
      email: userBEmail,
      password,
    });
    assert(signupB.status === 201, 'Created User B (Participant)');
    tokenB = signupB.data.token;
    userBId = signupB.data.user._id;

    // 4. Authenticated Post Creation & Validation
    console.log('\n[3/10] Testing Community Post Creation, Categories & Validation...');
    // Empty content rejected with 400
    const emptyPost = await apiCall('/community/posts', 'POST', {
      content: '   ',
    }, tokenA);
    assert(emptyPost.status === 400, 'Empty post content without media rejected with 400 Bad Request');

    // Unauthenticated creation rejected with 401
    const unauthPost = await apiCall('/community/posts', 'POST', {
      content: 'Unauthenticated post attempt',
    });
    assert(unauthPost.status === 401, 'Unauthenticated post creation blocked with 401');

    // User A creates a post under category "Dogs"
    const createDogPost = await apiCall('/community/posts', 'POST', {
      content: 'Fluffy is rolling! 🐾\n\nyyyyy she is so active. I am a proud pet parent.',
      category: 'Dogs',
    }, tokenA);
    assert(createDogPost.status === 201, 'User A created post under Dogs category (HTTP 201)');
    assert(createDogPost.data.post?.category === 'Dogs', 'Post category stored exactly as Dogs');
    const dogPostId = createDogPost.data.post?._id;

    // User A creates post with media metadata (image)
    const createMediaPost = await apiCall('/community/posts', 'POST', {
      content: 'Check out this sunset view with my dog!',
      category: 'Dogs',
      mediaKey: 'posts/test_dog.jpg',
      mediaType: 'image',
    }, tokenA);
    assert(createMediaPost.status === 201, 'Created post with image mediaKey');
    assert(createMediaPost.data.post?.mediaKey === 'posts/test_dog.jpg', 'Image mediaKey preserved');
    assert(createMediaPost.data.post?.mediaType === 'image', 'Image mediaType preserved');
    assert(Boolean(createMediaPost.data.post?.mediaUrl && createMediaPost.data.post.mediaUrl.startsWith('https://')), 'Image presigned mediaUrl generated dynamically');
    const mediaPostId = createMediaPost.data.post?._id;

    // Verify MongoDB directly: stable mediaKey preserved without saving dynamic mediaUrl
    const dbMediaPost = await Post.findById(mediaPostId);
    assert(dbMediaPost.mediaKey === 'posts/test_dog.jpg', 'mediaKey remains stable in MongoDB');
    assert(dbMediaPost.toObject().mediaUrl === undefined, 'Dynamic presigned mediaUrl is never stored in MongoDB');

    // User A creates image-only post (no content, only mediaKey)
    const imageOnlyPost = await apiCall('/community/posts', 'POST', {
      content: '',
      category: 'Dogs',
      mediaKey: 'posts/image_only.png',
      mediaType: 'image',
    }, tokenA);
    assert(imageOnlyPost.status === 201, 'Image-only post created successfully');
    assert(Boolean(imageOnlyPost.data.post?.mediaUrl && imageOnlyPost.data.post.mediaUrl.startsWith('https://')), 'Image-only post presigned mediaUrl generated');
    const imageOnlyPostId = imageOnlyPost.data.post?._id;

    // User A creates video post metadata (video/mp4)
    const videoPost = await apiCall('/community/posts', 'POST', {
      content: 'Puppy agility course video!',
      category: 'Pet Training',
      mediaKey: 'posts/puppy_run.mp4',
      mediaType: 'video',
    }, tokenA);
    assert(videoPost.status === 201, 'Video post created successfully');
    assert(videoPost.data.post?.mediaType === 'video', 'Video mediaType recognized as video');
    assert(Boolean(videoPost.data.post?.mediaUrl && videoPost.data.post.mediaUrl.startsWith('https://')), 'Video presigned mediaUrl generated dynamically');
    const videoPostId = videoPost.data.post?._id;

    // User A creates link-only post (HTTP/HTTPS URL in body without media)
    const linkPost = await apiCall('/community/posts', 'POST', {
      content: 'Useful puppy training guide\n\nFound this useful guide for new puppy owners:\nhttps://example.com/puppy-training',
      category: 'Dogs',
    }, tokenA);
    assert(linkPost.status === 201, 'Link-only post created successfully without media attachment');
    assert(linkPost.data.post?.content.includes('https://example.com/puppy-training'), 'URL preserved in post content without corruption');
    assert(!linkPost.data.post?.mediaKey, 'Link post has empty mediaKey');
    const linkPostId = linkPost.data.post?._id;

    // Standard Tip post for legacy assertions
    const createRes = await apiCall('/community/posts', 'POST', {
      content: 'Tips for training your rescue puppy to walk on a leash! 🐾\n\nConsistency and positive reinforcement make all the difference.',
      category: 'Tip',
    }, tokenA);
    assert(createRes.status === 201, 'User A created Tip community post with HTTP 201');
    assert(createRes.data.post?.author?.fullName === 'Author User A', 'Post author populated with user identity');
    assert(createRes.data.post?.category === 'Tip', 'Post category preserved');
    assert(createRes.data.post?.likesCount === 0, 'Initial likesCount initialized to 0');
    assert(createRes.data.post?.commentsCount === 0, 'Initial commentsCount initialized to 0');
    postId = createRes.data.post?._id;

    // 5. Post Retrieval & Category Filtering
    console.log('\n[4/10] Testing Community Post Retrieval & Society Filtering...');
    const allPosts = await apiCall('/community/posts', 'GET');
    assert(allPosts.status === 200, 'GET /api/community/posts returns 200 OK');
    assert(Array.isArray(allPosts.data.posts), 'Posts returned as array');
    assert(allPosts.data.posts.some(p => p._id === dogPostId), 'Deep Feed shows Dogs post');
    assert(allPosts.data.posts.some(p => p._id === linkPostId), 'Deep Feed shows link-only post');
    assert(allPosts.data.posts.some(p => p._id === postId), 'Deep Feed shows Tip post');

    // Filter by Dogs category: linkPostId and dogPostId must be included
    const dogCategoryPosts = await apiCall('/community/posts?category=Dogs', 'GET');
    assert(dogCategoryPosts.status === 200, 'GET /api/community/posts?category=Dogs returns 200');
    assert(dogCategoryPosts.data.posts.some(p => p._id === dogPostId), 'Dogs feed shows Dogs post');
    assert(dogCategoryPosts.data.posts.some(p => p._id === linkPostId), 'Dogs feed shows link-only post under Dogs category');
    assert(!dogCategoryPosts.data.posts.some(p => p._id === postId), 'Dogs feed excludes Tip post');

    // Filter by Cats category: must exclude Dogs posts
    const catCategoryPosts = await apiCall('/community/posts?category=Cats', 'GET');
    assert(catCategoryPosts.status === 200, 'GET /api/community/posts?category=Cats returns 200');
    assert(!catCategoryPosts.data.posts.some(p => p._id === dogPostId), 'Cats feed correctly excludes Dogs post');
    assert(!catCategoryPosts.data.posts.some(p => p._id === linkPostId), 'Cats feed correctly excludes link-only Dogs post');

    // Filter by Dogs category
    const dogsFilter = await apiCall('/community/posts?category=Dogs', 'GET');
    assert(dogsFilter.status === 200, 'GET /api/community/posts?category=Dogs returns 200');
    assert(dogsFilter.data.posts.some(p => p._id === dogPostId), 'Dogs feed shows Dogs post');
    assert(!dogsFilter.data.posts.some(p => p._id === postId), 'Dogs feed excludes Tip post');

    // Filter by Cats category (should NOT show dogs post)
    const catsFilter = await apiCall('/community/posts?category=Cats', 'GET');
    assert(catsFilter.status === 200, 'GET /api/community/posts?category=Cats returns 200');
    assert(!catsFilter.data.posts.some(p => p._id === dogPostId), 'Cats feed correctly excludes Dogs post');

    // Single post by ID
    const singlePost = await apiCall(`/community/posts/${postId}`, 'GET');
    assert(singlePost.status === 200, 'GET /api/community/posts/:id returns 200');
    assert(singlePost.data.post?.author?.fullName === 'Author User A', 'Single post author populated');

    // 6. Reddit-Style Upvote / Downvote State Machine
    console.log('\n[5/10] Testing Reddit-Style Voting State Machine & Multi-User Isolation...');
    // Step 1: No vote -> Click Upvote -> Upvoted (+1)
    const up1 = await apiCall(`/community/posts/${postId}/like`, 'POST', { voteType: 'up' }, tokenB);
    assert(up1.status === 200, 'No vote -> Upvote returns 200');
    assert(up1.data.userVote === 1, 'userVote is 1 (Upvoted)');
    assert(up1.data.likesCount === 1, 'likesCount is 1');
    assert(up1.data.voteScore === 1, 'voteScore is 1');

    // Step 2: Upvoted -> Click Upvote again -> Neutral (0)
    const upAgain = await apiCall(`/community/posts/${postId}/like`, 'POST', { voteType: 'up' }, tokenB);
    assert(upAgain.status === 200, 'Upvoted -> Upvote again returns 200');
    assert(upAgain.data.userVote === 0, 'userVote returns to 0 (neutral)');
    assert(upAgain.data.likesCount === 0, 'likesCount reset to 0');
    assert(upAgain.data.voteScore === 0, 'voteScore reset to 0');

    // Step 3: No vote -> Click Downvote -> Downvoted (-1)
    const down1 = await apiCall(`/community/posts/${postId}/like`, 'POST', { voteType: 'down' }, tokenB);
    assert(down1.status === 200, 'No vote -> Downvote returns 200');
    assert(down1.data.userVote === -1, 'userVote is -1 (Downvoted)');
    assert(down1.data.downvotesCount === 1, 'downvotesCount is 1');
    assert(down1.data.voteScore === -1, 'voteScore is -1');

    // Step 4: Downvoted -> Click Downvote again -> Neutral (0)
    const downAgain = await apiCall(`/community/posts/${postId}/like`, 'POST', { voteType: 'down' }, tokenB);
    assert(downAgain.status === 200, 'Downvoted -> Downvote again returns 200');
    assert(downAgain.data.userVote === 0, 'userVote returns to 0 (neutral)');
    assert(downAgain.data.downvotesCount === 0, 'downvotesCount reset to 0');
    assert(downAgain.data.voteScore === 0, 'voteScore reset to 0');

    // Step 5: Upvoted -> Click Downvote -> switch directly to Downvoted (-1)
    await apiCall(`/community/posts/${postId}/like`, 'POST', { voteType: 'up' }, tokenB);
    const switchToDown = await apiCall(`/community/posts/${postId}/like`, 'POST', { voteType: 'down' }, tokenB);
    assert(switchToDown.data.userVote === -1, 'Upvoted -> Downvote switches directly to Downvoted (-1)');
    assert(switchToDown.data.likesCount === 0, 'Old upvote removed');
    assert(switchToDown.data.downvotesCount === 1, 'New downvote registered');
    assert(switchToDown.data.voteScore === -1, 'Net vote score is -1');

    // Step 6: Downvoted -> Click Upvote -> switch directly to Upvoted (+1)
    const switchToUp = await apiCall(`/community/posts/${postId}/like`, 'POST', { voteType: 'up' }, tokenB);
    assert(switchToUp.data.userVote === 1, 'Downvoted -> Upvote switches directly to Upvoted (+1)');
    assert(switchToUp.data.likesCount === 1, 'Upvote registered');
    assert(switchToUp.data.downvotesCount === 0, 'Old downvote removed');
    assert(switchToUp.data.voteScore === 1, 'Net vote score is +1');

    // Verify persistence in MongoDB
    const postInDb = await Post.findById(postId);
    assert(postInDb.likes.includes(userBId), 'User B ID persisted in likes array');
    assert(!postInDb.downvotes.includes(userBId), 'User B ID not in downvotes array');

    // 7. Persistent Save / Bookmark Functionality & Isolation
    console.log('\n[6/10] Testing Persistent Save/Bookmark & Multi-User Isolation...');
    // User A saves post
    const saveResA = await apiCall(`/community/posts/${postId}/save`, 'POST', null, tokenA);
    assert(saveResA.status === 200, 'User A saved post with HTTP 200');
    assert(saveResA.data.saved === true, 'Response confirms post is saved');

    // Verify in MongoDB
    const postSavedDb = await Post.findById(postId);
    assert(postSavedDb.savedBy.includes(userAId), 'User A ID recorded in post.savedBy in MongoDB');
    assert(!postSavedDb.savedBy.includes(userBId), 'User B ID is NOT in savedBy (Isolation verified)');

    // User A queries saved posts
    const userASavedPosts = await apiCall('/community/posts?saved=true', 'GET', null, tokenA);
    assert(userASavedPosts.status === 200, 'User A retrieved saved posts');
    assert(userASavedPosts.data.posts.some(p => p._id === postId), 'Saved post appears in User A saved feed');

    // User B queries saved posts (Must NOT see User A saved post)
    const userBSavedPosts = await apiCall('/community/posts?saved=true', 'GET', null, tokenB);
    assert(userBSavedPosts.status === 200, 'User B retrieved saved posts');
    assert(!userBSavedPosts.data.posts.some(p => p._id === postId), 'User B saved feed does NOT contain User A post');

    // User A unsaves post
    const unsaveResA = await apiCall(`/community/posts/${postId}/save`, 'POST', null, tokenA);
    assert(unsaveResA.status === 200, 'User A unsaved post');
    assert(unsaveResA.data.saved === false, 'Response confirms post is unsaved');
    const postUnsavedDb = await Post.findById(postId);
    assert(!postUnsavedDb.savedBy.includes(userAId), 'User A ID removed from savedBy in MongoDB');

    // User A queries saved posts again -> must be empty / no longer contain postId
    const userAPostUnsaved = await apiCall('/community/posts?saved=true', 'GET', null, tokenA);
    assert(userAPostUnsaved.status === 200, 'User A retrieved updated saved posts list');
    assert(!userAPostUnsaved.data.posts.some(p => p._id === postId), 'Unsaved post no longer appears in User A saved feed (Profile visibility removed)');

    // 8. Comment Creation & Retrieval
    console.log('\n[7/10] Testing Comment Creation, Population & Counter Synchronization...');
    // User B adds comment to User A's post
    const commentRes = await apiCall(`/community/posts/${postId}/comments`, 'POST', {
      content: 'This leash training method worked wonders for my Golden Retriever!',
    }, tokenB);
    assert(commentRes.status === 201, 'User B added comment with HTTP 201');
    assert(commentRes.data.comment?.author?.fullName === 'Commenter User B', 'Comment author populated');
    commentId = commentRes.data.comment?._id;

    // Verify post's commentsCount was automatically incremented
    const postAfterComment = await Post.findById(postId);
    assert(postAfterComment.commentsCount === 1, 'Post commentsCount automatically incremented in MongoDB');

    // Retrieve comments for post
    const postComments = await apiCall(`/community/posts/${postId}/comments`, 'GET');
    assert(postComments.status === 200, 'GET /api/community/posts/:postId/comments returns 200');
    assert(Array.isArray(postComments.data.comments), 'Comments returned as array');
    assert(postComments.data.comments.some(c => c._id === commentId), 'Added comment found in post comments');

    // 9. Cross-User Authorization & Security Isolation
    console.log('\n[8/10] Testing Cross-User Security Boundaries & Authorization (403)...');
    // User B attempts to edit User A's post -> MUST FAIL with 403
    const hijackPost = await apiCall(`/community/posts/${postId}`, 'PUT', {
      content: 'Malicious modification by unauthorized user',
    }, tokenB);
    assert(hijackPost.status === 403, 'Cross-user post modification blocked with 403 Forbidden');

    // User A attempts to edit User B's comment -> MUST FAIL with 403
    const hijackComment = await apiCall(`/community/comments/${commentId}`, 'PUT', {
      content: 'Unauthorized comment edit attempt',
    }, tokenA);
    assert(hijackComment.status === 403, 'Cross-user comment modification blocked with 403 Forbidden');

    // User B attempts to delete User A's post -> MUST FAIL with 403
    const unauthDeletePost = await apiCall(`/community/posts/${postId}`, 'DELETE', null, tokenB);
    assert(unauthDeletePost.status === 403, 'Cross-user post deletion blocked with 403 Forbidden');

    // User A attempts to delete User B's comment -> MUST FAIL with 403
    const unauthDeleteComment = await apiCall(`/community/comments/${commentId}`, 'DELETE', null, tokenA);
    assert(unauthDeleteComment.status === 403, 'Cross-user comment deletion blocked with 403 Forbidden');

    // 10. Legitimate Updates, Deletions & Persistence
    console.log('\n[9/10] Testing Legitimate Update, Deletion & Cascading Cleanup...');
    // User B updates own comment -> SUCCEEDS
    const updateCommentRes = await apiCall(`/community/comments/${commentId}`, 'PUT', {
      content: 'Updated: This leash training method worked wonders for my Golden Retriever!',
    }, tokenB);
    assert(updateCommentRes.status === 200, 'Author User B updated own comment');
    assert(updateCommentRes.data.comment?.content.includes('Updated:'), 'Updated comment persisted in MongoDB');

    // User A updates own post -> SUCCEEDS
    const updatePostRes = await apiCall(`/community/posts/${postId}`, 'PUT', {
      content: 'Updated: Tips for training your rescue puppy to walk on a leash! 🐾',
      category: 'Tip',
    }, tokenA);
    assert(updatePostRes.status === 200, 'Author User A updated own post');
    assert(updatePostRes.data.post?.content.includes('Updated:'), 'Updated post content persisted in MongoDB');

    // User B deletes own comment -> SUCCEEDS
    const deleteCommentRes = await apiCall(`/community/comments/${commentId}`, 'DELETE', null, tokenB);
    assert(deleteCommentRes.status === 200, 'Author User B deleted own comment');

    // Verify post's commentsCount decremented
    const postAfterCommentDelete = await Post.findById(postId);
    assert(postAfterCommentDelete.commentsCount === 0, 'Post commentsCount decremented after comment deletion');

    // User A deletes own post -> SUCCEEDS
    const deletePostRes = await apiCall(`/community/posts/${postId}`, 'DELETE', null, tokenA);
    assert(deletePostRes.status === 200, 'Author User A deleted own post');

    // Cleanup auxiliary test posts
    await Post.findByIdAndDelete(dogPostId).catch(() => {});
    await Post.findByIdAndDelete(mediaPostId).catch(() => {});
    await Post.findByIdAndDelete(imageOnlyPostId).catch(() => {});
    await Post.findByIdAndDelete(videoPostId).catch(() => {});

    // Verify deleted post returns 404
    const fetchDeleted = await apiCall(`/community/posts/${postId}`, 'GET');
    assert(fetchDeleted.status === 404, 'Deleted post returns 404 Not Found');

    // 10. Custom Society Lifecycle, Security & Post Reassignment (Phase 6 Delete Society)
    console.log('\n[10/11] Testing Custom Society Creation, Security, Deletion & Post Reassignment...');

    // A. Create custom society as User A
    const createSocietyRes = await apiCall('/community/societies', 'POST', {
      name: 'Hamster Collective',
      icon: '🐹',
    }, tokenA);
    assert(createSocietyRes.status === 201, 'Author User A created custom society');
    assert(createSocietyRes.data.society?.name === 'Hamster Collective', 'Created society has correct name');
    testSocietyId = createSocietyRes.data.society?.id || createSocietyRes.data.society?._id;

    // B. Verify created society appears in society list
    const societiesListRes1 = await apiCall('/community/societies', 'GET');
    assert(societiesListRes1.status === 200, 'Fetched societies list');
    const foundInList = societiesListRes1.data.societies?.some((s) => s.name === 'Hamster Collective');
    assert(foundInList, 'Custom society appears in public society list');

    // C. Unauthenticated deletion rejected with 401
    const unauthDeleteSoc = await apiCall(`/community/societies/${testSocietyId}`, 'DELETE', null, null);
    assert(unauthDeleteSoc.status === 401, 'Unauthenticated society deletion rejected with 401 Unauthorized');

    // D. Non-owner (User B) deletion rejected with 403
    const forbiddenDeleteSoc = await apiCall(`/community/societies/${testSocietyId}`, 'DELETE', null, tokenB);
    assert(forbiddenDeleteSoc.status === 403, 'Non-owner society deletion rejected with 403 Forbidden');

    // E. Built-in society deletion rejected with 403
    const deleteBuiltIn = await apiCall('/community/societies/dogs', 'DELETE', null, tokenA);
    assert(deleteBuiltIn.status === 403, 'Built-in society deletion rejected with 403 Forbidden');

    // F. Non-existent society returns 404
    const nonExistentSoc = await apiCall('/community/societies/507f1f77bcf86cd799439011', 'DELETE', null, tokenA);
    assert(nonExistentSoc.status === 404, 'Non-existent society deletion rejected with 404 Not Found');

    // G. Create post under the custom society
    const hamsterPostRes = await apiCall('/community/posts', 'POST', {
      content: 'Hamsters are the best pocket pets! 🐹',
      category: 'Hamster Collective',
    }, tokenA);
    assert(hamsterPostRes.status === 201, 'Created post belonging to custom society');
    hamsterPostId = hamsterPostRes.data.post?._id;

    // H. Creator (User A) deletes own custom society -> SUCCEEDS
    const deleteSocietyRes = await apiCall(`/community/societies/${testSocietyId}`, 'DELETE', null, tokenA);
    assert(deleteSocietyRes.status === 200, 'Creator User A deleted custom society');
    assert(deleteSocietyRes.data.success === true, 'Delete society returns success: true');

    // I. Verify society is removed from societies list
    const societiesListRes2 = await apiCall('/community/societies', 'GET');
    const stillInList = societiesListRes2.data.societies?.some((s) => s.id === testSocietyId || s.name === 'Hamster Collective');
    assert(!stillInList, 'Deleted society immediately removed from society list');

    // J. Verify post is PRESERVED and REASSIGNED to "General"
    const reassignedPostRes = await apiCall(`/community/posts/${hamsterPostId}`, 'GET');
    assert(reassignedPostRes.status === 200, 'Post belonging to deleted society is preserved');
    assert(
      reassignedPostRes.data.post?.category === 'General',
      `Post reassigned to "General" (actual: ${reassignedPostRes.data.post?.category})`
    );

    // Cleanup hamster test post
    if (hamsterPostId) {
      await Post.findByIdAndDelete(hamsterPostId).catch(() => {});
      hamsterPostId = null;
    }
    testSocietyId = null;

    console.log('\n[11/11] Verifying Clean State...');
    assert(true, 'All phase 6 test scenarios verified');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PHASE 6 COMMUNITY TESTS PASSED!`);
    console.log('====================================================\n');
  } finally {
    console.log('🧹 Cleaning up test artifacts from MongoDB Atlas...');
    if (testSocietyId) await Society.findByIdAndDelete(testSocietyId).catch(() => {});
    if (hamsterPostId) await Post.findByIdAndDelete(hamsterPostId).catch(() => {});
    if (commentId) await Comment.findByIdAndDelete(commentId).catch(() => {});
    if (postId) await Post.findByIdAndDelete(postId).catch(() => {});
    if (userAId) await User.findByIdAndDelete(userAId).catch(() => {});
    if (userBId) await User.findByIdAndDelete(userBId).catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log('  ✅ Ephemeral test server closed & MongoDB disconnected.\n');
  }
};

runPhase6Tests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
