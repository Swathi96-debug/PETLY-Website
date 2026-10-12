import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import Notification from './models/Notification.js';
import generateToken from './utils/generateToken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const API_BASE = 'http://localhost:5000';

const runCommunityNotificationTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 10B COMMUNITY NOTIFICATIONS TEST SUITE');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined.');
    process.exit(1);
  }

  const createdUserIds = [];
  const createdPostIds = [];
  const createdCommentIds = [];
  const createdNotificationIds = [];

  try {
    // 1. Connect to MongoDB Atlas
    console.log('\n[Init] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas.');

    // Create 2 test users: User A (Post Author) and User B (Community Member)
    const timestamp = Date.now();
    const userA = await User.create({
      fullName: 'Author Amy',
      email: `amy_${timestamp}@petly.com`,
      phone: '+919876543220',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userA._id);
    const tokenA = generateToken(userA._id);

    const userB = await User.create({
      fullName: 'Member Ben',
      email: `ben_${timestamp}@petly.com`,
      phone: '+919876543221',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userB._id);
    const tokenB = generateToken(userB._id);

    // Create test post by User A
    const postA = await Post.create({
      author: userA._id,
      title: 'Our Golden Retriever adopted today!',
      content: 'So happy to welcome Buddy to our family.',
      category: 'general',
      likes: [],
      likesCount: 0,
      commentsCount: 0,
    });
    createdPostIds.push(postA._id);
    console.log(`✅ Test Post created: ID=${postA._id} by User A (${userA.fullName})`);

    // ------------------------------------------------------------------------
    // Test 1: Self-Interaction Should NOT Generate Notification
    // ------------------------------------------------------------------------
    console.log('\n[Test 1] User A likes and comments on their OWN post...');
    // User A likes their own post
    const resSelfLike = await fetch(`${API_BASE}/api/community/posts/${postA._id}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
    });
    if (resSelfLike.status !== 200) {
      throw new Error(`Test 1 Failed: Self-like HTTP error ${resSelfLike.status}`);
    }

    // User A comments on their own post
    const resSelfComment = await fetch(`${API_BASE}/api/community/posts/${postA._id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        content: 'Replying to my own post with more photos soon!',
      }),
    });
    const dataSelfComment = await resSelfComment.json();
    if (resSelfComment.status !== 201) {
      throw new Error(`Test 1 Failed: Self-comment HTTP error ${resSelfComment.status}`);
    }
    if (dataSelfComment.comment?._id) {
      createdCommentIds.push(dataSelfComment.comment._id);
    }

    // Verify 0 notifications were created for User A
    const selfNotifs = await Notification.find({ user: userA._id });
    if (selfNotifs.length !== 0) {
      throw new Error(`Test 1 Failed: Expected 0 self-notifications, found ${selfNotifs.length}`);
    }
    console.log('✅ Test 1 Passed: No notifications created for self-like or self-comment.');

    // ------------------------------------------------------------------------
    // Test 2: Like Notification (User B likes User A's post)
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] User B likes User A\'s post...');
    const resLike = await fetch(`${API_BASE}/api/community/posts/${postA._id}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
    });
    const dataLike = await resLike.json();
    if (resLike.status !== 200 || !dataLike.liked) {
      throw new Error(`Test 2 Failed: Status ${resLike.status}, Response: ${JSON.stringify(dataLike)}`);
    }

    // Check notification in DB for User A
    const likeNotif = await Notification.findOne({
      user: userA._id,
      type: 'community',
      'metadata.postId': postA._id,
      'metadata.senderId': userB._id,
      'metadata.action': 'like',
    });
    if (!likeNotif) {
      throw new Error('Test 2 Failed: Like notification was not created in MongoDB for User A!');
    }
    createdNotificationIds.push(likeNotif._id);
    if (!likeNotif.message.includes('Member Ben') || !likeNotif.link.includes(postA._id.toString())) {
      throw new Error(`Test 2 Failed: Notification content or link malformed: ${JSON.stringify(likeNotif)}`);
    }
    console.log(`✅ Test 2 Passed: Like notification created for User A: "${likeNotif.message}" (link: ${likeNotif.link})`);

    // ------------------------------------------------------------------------
    // Test 3: Duplicate Like Prevention (User B unlikes and re-likes)
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] User B unlikes and re-likes the post (checking duplicate prevention)...');
    // Unlike
    await fetch(`${API_BASE}/api/community/posts/${postA._id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    });
    // Re-like
    await fetch(`${API_BASE}/api/community/posts/${postA._id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    });

    const likeNotifsCount = await Notification.countDocuments({
      user: userA._id,
      type: 'community',
      'metadata.postId': postA._id,
      'metadata.senderId': userB._id,
      'metadata.action': 'like',
    });
    if (likeNotifsCount !== 1) {
      throw new Error(`Test 3 Failed: Duplicate like notifications created! Count=${likeNotifsCount}`);
    }
    console.log('✅ Test 3 Passed: Re-liking post did not create duplicate like notification.');

    // ------------------------------------------------------------------------
    // Test 4: Comment Notification (User B comments on User A's post)
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] User B comments on User A\'s post...');
    const commentText = 'Congratulations! Golden Retrievers are the sweetest companions.';
    const resComment = await fetch(`${API_BASE}/api/community/posts/${postA._id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        content: commentText,
      }),
    });
    const dataComment = await resComment.json();
    if (resComment.status !== 201 || !dataComment.success || !dataComment.comment) {
      throw new Error(`Test 4 Failed: Status ${resComment.status}, Message: ${dataComment.message}`);
    }
    createdCommentIds.push(dataComment.comment._id);

    const commentNotif = await Notification.findOne({
      user: userA._id,
      type: 'community',
      'metadata.postId': postA._id,
      'metadata.senderId': userB._id,
      'metadata.action': 'comment',
    });
    if (!commentNotif) {
      throw new Error('Test 4 Failed: Comment notification was not created in MongoDB for User A!');
    }
    createdNotificationIds.push(commentNotif._id);
    if (!commentNotif.message.includes('Member Ben') || !commentNotif.link.includes(postA._id.toString())) {
      throw new Error(`Test 4 Failed: Notification content or link malformed: ${JSON.stringify(commentNotif)}`);
    }
    console.log(`✅ Test 4 Passed: Comment notification created for User A: "${commentNotif.message}"`);

    // ------------------------------------------------------------------------
    // Test 5: Fetch Notifications & Unread Count (User A)
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] User A fetches their notifications via GET /api/notifications...');
    const resGet = await fetch(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const dataGet = await resGet.json();
    if (resGet.status !== 200 || !dataGet.success) {
      throw new Error(`Test 5 Failed: Status ${resGet.status}, Message: ${dataGet.message}`);
    }
    if (dataGet.count !== 2 || dataGet.unreadCount !== 2) {
      throw new Error(`Test 5 Failed: Expected 2 notifications (2 unread), got count=${dataGet.count}, unread=${dataGet.unreadCount}`);
    }
    console.log(`✅ Test 5 Passed: Successfully retrieved ${dataGet.count} notifications, unreadCount=${dataGet.unreadCount}`);

    // ------------------------------------------------------------------------
    // Test 6: Ownership Check on Modification (User B cannot mark User A's notification as read)
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] User B attempts to mark User A\'s notification as read (unauthorized)...');
    const resBadRead = await fetch(`${API_BASE}/api/notifications/${likeNotif._id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const dataBadRead = await resBadRead.json();
    if (resBadRead.status !== 403 || dataBadRead.success !== false) {
      throw new Error(`Test 6 Failed: Expected 403, got status ${resBadRead.status}`);
    }
    console.log(`✅ Test 6 Passed: Unauthorized modification rejected with 403: "${dataBadRead.message}"`);

    // ------------------------------------------------------------------------
    // Test 7: Mark Single Notification as Read (User A)
    // ------------------------------------------------------------------------
    console.log('\n[Test 7] User A marks the like notification as read...');
    const resMarkOne = await fetch(`${API_BASE}/api/notifications/${likeNotif._id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const dataMarkOne = await resMarkOne.json();
    if (resMarkOne.status !== 200 || !dataMarkOne.success || !dataMarkOne.notification.isRead) {
      throw new Error(`Test 7 Failed: Status ${resMarkOne.status}, Message: ${dataMarkOne.message}`);
    }

    const checkOneDB = await Notification.findById(likeNotif._id);
    if (!checkOneDB.isRead) {
      throw new Error('Test 7 Failed: isRead is not true in MongoDB!');
    }
    console.log('✅ Test 7 Passed: Single notification marked as read in database.');

    // ------------------------------------------------------------------------
    // Test 8: Mark All Notifications as Read (User A)
    // ------------------------------------------------------------------------
    console.log('\n[Test 8] User A marks all notifications as read...');
    const resMarkAll = await fetch(`${API_BASE}/api/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const dataMarkAll = await resMarkAll.json();
    if (resMarkAll.status !== 200 || !dataMarkAll.success) {
      throw new Error(`Test 8 Failed: Status ${resMarkAll.status}, Message: ${dataMarkAll.message}`);
    }

    const unreadRemaining = await Notification.countDocuments({ user: userA._id, isRead: false });
    if (unreadRemaining !== 0) {
      throw new Error(`Test 8 Failed: Expected 0 unread remaining, got ${unreadRemaining}`);
    }
    console.log('✅ Test 8 Passed: All notifications marked read (0 unread remaining in database).');

    // ------------------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------------------
    console.log('\n[Cleanup] Cleaning up temporary test records...');
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await Post.deleteMany({ _id: { $in: createdPostIds } });
    await Comment.deleteMany({ _id: { $in: createdCommentIds } });
    await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
    console.log('🧹 Deleted test users, posts, comments, and notifications.');

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 10B COMMUNITY NOTIFICATION TESTS PASSED!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Phase 10B Test Suite Failed:', err);
    if (createdUserIds.length > 0) {
      try {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Post.deleteMany({ _id: { $in: createdPostIds } });
        await Comment.deleteMany({ _id: { $in: createdCommentIds } });
        await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
      } catch {}
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runCommunityNotificationTests();
