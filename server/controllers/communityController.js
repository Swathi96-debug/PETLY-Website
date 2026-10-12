import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Society from '../models/Society.js';
import Notification from '../models/Notification.js';
import { deleteS3Object, generatePresignedUrl } from '../utils/s3Uploader.js';
import { isS3Configured } from '../config/s3.js';
import { isValidObjectId } from '../utils/validateObjectId.js';

// Helper to enrich post with S3 presigned URL for media
const attachPostMediaUrl = async (post) => {
  const postObj = typeof post?.toObject === 'function' ? post.toObject() : { ...post };
  if (postObj && postObj.mediaKey && isS3Configured()) {
    try {
      postObj.mediaUrl = await generatePresignedUrl(postObj.mediaKey, 3600);
    } catch (e) {
      postObj.mediaUrl = '';
    }
  } else if (postObj) {
    postObj.mediaUrl = '';
  }
  return postObj;
};

// ==========================================
// POSTS
// ==========================================

// @desc    Create community post
// @route   POST /api/community/posts
// @access  Private
export const createPost = async (req, res, next) => {
  try {
    const { content, category, mediaKey, mediaType } = req.body;

    const trimmedContent = (content || '').trim();
    const safeMediaKey = (mediaKey || '').trim();

    if (!trimmedContent && !safeMediaKey) {
      return res.status(400).json({
        success: false,
        message: 'Post content or media attachment is required.',
      });
    }

    let resolvedMediaType = (mediaType || '').trim();
    if (!resolvedMediaType && safeMediaKey) {
      resolvedMediaType = safeMediaKey.match(/\.(mp4|webm)$/i) ? 'video' : 'image';
    }

    const post = await Post.create({
      author: req.user._id,
      content: trimmedContent,
      category: (category || 'General').trim(),
      mediaKey: safeMediaKey,
      mediaType: resolvedMediaType,
    });

    const populatedPost = await Post.findById(post._id).populate('author', 'fullName avatarUrl role bio');
    const enrichedPost = await attachPostMediaUrl(populatedPost);

    res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      post: enrichedPost,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all community posts
// @route   GET /api/community/posts
// @access  Public / Private
export const getPosts = async (req, res, next) => {
  try {
    const { category, author, saved } = req.query;
    const filter = {};

    if (category) {
      filter.category = new RegExp(`^${category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }

    if (author && isValidObjectId(author)) {
      filter.author = author;
    }

    if (saved === 'true') {
      if (req.user?._id) {
        filter.savedBy = req.user._id;
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          posts: [],
        });
      }
    }

    const posts = await Post.find(filter)
      .populate('author', 'fullName avatarUrl role bio')
      .sort({ createdAt: -1 });

    const enrichedPosts = await Promise.all(posts.map(attachPostMediaUrl));

    res.status(200).json({
      success: true,
      count: enrichedPosts.length,
      posts: enrichedPosts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single post by ID
// @route   GET /api/community/posts/:id
// @access  Public / Private
export const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Post ID: ${id}`,
      });
    }

    const post = await Post.findById(id).populate('author', 'fullName avatarUrl role bio');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const enrichedPost = await attachPostMediaUrl(post);

    res.status(200).json({
      success: true,
      post: enrichedPost,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update community post
// @route   PUT /api/community/posts/:id
// @access  Private (Author or Admin)
export const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Post ID: ${id}`,
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Ownership or admin
    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own posts.',
      });
    }

    const { content, category, mediaKey, mediaType } = req.body;
    if (content !== undefined) post.content = content.trim();
    if (category !== undefined) post.category = category.trim();
    if (mediaKey !== undefined) {
      post.mediaKey = mediaKey.trim();
      if (!mediaType && post.mediaKey) {
        post.mediaType = post.mediaKey.match(/\.(mp4|webm)$/i) ? 'video' : 'image';
      }
    }
    if (mediaType !== undefined) post.mediaType = mediaType;

    const updated = await post.save();
    const populated = await Post.findById(updated._id).populate('author', 'fullName avatarUrl role bio');
    const enriched = await attachPostMediaUrl(populated);

    res.status(200).json({
      success: true,
      message: 'Post updated successfully.',
      post: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete community post
// @route   DELETE /api/community/posts/:id
// @access  Private (Author or Admin)
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Post ID: ${id}`,
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own posts.',
      });
    }

    // Safely delete media from S3 if configured
    if (post.mediaKey && isS3Configured()) {
      await deleteS3Object(post.mediaKey).catch(() => {});
    }

    // Delete associated comments
    await Comment.deleteMany({ post: post._id });

    await Post.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Post and associated comments removed successfully.',
      postId: id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle like / vote on post (Reddit-style state machine)
// @route   POST /api/community/posts/:id/like or POST /api/community/posts/:id/vote
// @access  Private
export const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Post ID: ${id}`,
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const userIdStr = req.user._id.toString();
    if (!Array.isArray(post.likes)) post.likes = [];
    if (!Array.isArray(post.downvotes)) post.downvotes = [];

    const isUpvoted = post.likes.some((u) => u.toString() === userIdStr);
    const isDownvoted = post.downvotes.some((u) => u.toString() === userIdStr);

    const requestedVote = (req.body?.voteType || req.body?.action || '').toLowerCase();

    let userVote = 0; // 1 = upvoted, -1 = downvoted, 0 = neutral

    if (requestedVote === 'down' || requestedVote === 'downvote') {
      if (isDownvoted) {
        // Downvoted -> click Downvote again -> remove vote / return to neutral
        post.downvotes = post.downvotes.filter((u) => u.toString() !== userIdStr);
        userVote = 0;
      } else {
        // No vote -> Downvoted, or Upvoted -> switch directly to Downvoted
        post.likes = post.likes.filter((u) => u.toString() !== userIdStr);
        post.downvotes.push(req.user._id);
        userVote = -1;
      }
    } else if (requestedVote === 'up' || requestedVote === 'upvote') {
      if (isUpvoted) {
        // Upvoted -> click Upvote again -> remove vote / return to neutral
        post.likes = post.likes.filter((u) => u.toString() !== userIdStr);
        userVote = 0;
      } else {
        // No vote -> Upvoted, or Downvoted -> switch directly to Upvoted
        post.downvotes = post.downvotes.filter((u) => u.toString() !== userIdStr);
        post.likes.push(req.user._id);
        userVote = 1;
      }
    } else {
      // Default toggle like (backward-compatible)
      if (isUpvoted) {
        post.likes = post.likes.filter((u) => u.toString() !== userIdStr);
        userVote = 0;
      } else {
        post.downvotes = post.downvotes.filter((u) => u.toString() !== userIdStr);
        post.likes.push(req.user._id);
        userVote = 1;
      }
    }

    post.likesCount = post.likes.length;
    post.downvotesCount = post.downvotes.length;
    await post.save();

    // Create community notification if liking another user's post
    const isPostOwner = post.author && post.author.toString() === req.user._id.toString();
    if (userVote === 1 && !isPostOwner && post.author) {
      try {
        const existingNotif = await Notification.findOne({
          user: post.author,
          type: 'community',
          'metadata.postId': post._id,
          'metadata.senderId': req.user._id,
          'metadata.action': 'like',
        });

        if (!existingNotif) {
          const postSnippet = post.content ? (post.content.length > 30 ? post.content.slice(0, 30) + '...' : post.content) : (post.title || 'your post');
          await Notification.create({
            user: post.author,
            type: 'community',
            title: 'New Like on Your Post',
            message: `${req.user.fullName || 'Someone'} liked your post "${postSnippet}".`,
            link: `/community/post/${post._id}`,
            metadata: {
              postId: post._id,
              senderId: req.user._id,
              action: 'like',
            },
          });
        }
      } catch (notifErr) {
        console.error('Failed to create like notification:', notifErr.message);
      }
    }

    res.status(200).json({
      success: true,
      liked: userVote === 1,
      userVote,
      likesCount: post.likesCount,
      downvotesCount: post.downvotesCount,
      voteScore: post.likesCount - post.downvotesCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle save/bookmark on post
// @route   POST /api/community/posts/:id/save
// @access  Private
export const toggleSavePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Post ID: ${id}`,
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const userIdStr = req.user._id.toString();
    if (!Array.isArray(post.savedBy)) post.savedBy = [];

    const isAlreadySaved = post.savedBy.some((u) => u.toString() === userIdStr);

    if (isAlreadySaved) {
      post.savedBy = post.savedBy.filter((u) => u.toString() !== userIdStr);
    } else {
      post.savedBy.push(req.user._id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      saved: !isAlreadySaved,
      savedCount: post.savedBy.length,
      message: !isAlreadySaved ? 'Post saved to bookmarks.' : 'Post removed from bookmarks.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// COMMENTS
// ==========================================

// @desc    Add comment to post
// @route   POST /api/community/posts/:postId/comments
// @access  Private
export const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(postId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Post ID: ${postId}`,
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required.',
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      content: content.trim(),
    });

    // Update post comments count
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    // Create community notification if commenting on another user's post
    const isPostOwner = post.author && post.author.toString() === req.user._id.toString();
    if (!isPostOwner && post.author) {
      try {
        const postSnippet = post.content ? (post.content.length > 30 ? post.content.slice(0, 30) + '...' : post.content) : (post.title || 'your post');
        const snippet = content.trim().slice(0, 50) + (content.trim().length > 50 ? '...' : '');
        await Notification.create({
          user: post.author,
          type: 'community',
          title: 'New Comment on Your Post',
          message: `${req.user.fullName || 'Someone'} commented on "${postSnippet}": "${snippet}"`,
          link: `/community/post/${post._id}`,
          metadata: {
            postId: post._id,
            senderId: req.user._id,
            commentId: comment._id,
            action: 'comment',
          },
        });
      } catch (notifErr) {
        console.error('Failed to create comment notification:', notifErr.message);
      }
    }

    const populated = await Comment.findById(comment._id).populate('author', 'fullName avatarUrl role');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      comment: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments for post
// @route   GET /api/community/posts/:postId/comments
// @access  Public / Private
export const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Post ID: ${postId}`,
      });
    }

    const comments = await Comment.find({ post: postId })
      .populate('author', 'fullName avatarUrl role')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update comment
// @route   PUT /api/community/comments/:id
// @access  Private (Author or Admin)
export const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Comment ID: ${id}`,
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty.',
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own comments.',
      });
    }

    comment.content = content.trim();
    const updated = await comment.save();

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully.',
      comment: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete comment
// @route   DELETE /api/community/comments/:id
// @access  Private (Author or Admin)
export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Comment ID: ${id}`,
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own comments.',
      });
    }

    // Decrement post comments count
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    await Comment.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
      commentId: id,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SOCIETIES
// ==========================================

export const BUILTIN_SOCIETIES = [
  { id: 'dogs', name: 'Dogs', slug: 'dogs', icon: '🐕', members: '1.2m', isBuiltIn: true },
  { id: 'cats', name: 'Cats', slug: 'cats', icon: '🐈', members: '980k', isBuiltIn: true },
  { id: 'birds', name: 'Birds', slug: 'birds', icon: '🦜', members: '120k', isBuiltIn: true },
  { id: 'rescue', name: 'Pet Rescue Stories', slug: 'rescue', icon: '❤️', members: '450k', isBuiltIn: true },
  { id: 'health', name: 'Pet Health', slug: 'health', icon: '🏥', members: '310k', isBuiltIn: true },
  { id: 'training', name: 'Pet Training', slug: 'training', icon: '🎓', members: '280k', isBuiltIn: true },
];

// @desc    Get all societies (built-in + custom from MongoDB)
// @route   GET /api/community/societies
// @access  Public
export const getSocieties = async (req, res, next) => {
  try {
    const customSocieties = await Society.find().populate('creator', 'fullName avatarUrl');

    const formattedCustom = customSocieties.map((s) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      name: s.name,
      slug: s.slug,
      icon: s.icon,
      members: `${s.membersCount || 1}`,
      adminId: s.creator?._id ? s.creator._id.toString() : (s.creator ? s.creator.toString() : 'user'),
      creator: s.creator,
      isBuiltIn: false,
      createdAt: s.createdAt,
    }));

    const allSocieties = [...BUILTIN_SOCIETIES, ...formattedCustom];

    res.status(200).json({
      success: true,
      count: allSocieties.length,
      societies: allSocieties,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create custom society
// @route   POST /api/community/societies
// @access  Private
export const createSociety = async (req, res, next) => {
  try {
    const { name, icon } = req.body;
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Society name is required.',
      });
    }

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if matching built-in name or slug
    const isBuiltInConflict = BUILTIN_SOCIETIES.some(
      (b) => b.slug === slug || b.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isBuiltInConflict) {
      return res.status(400).json({
        success: false,
        message: 'A built-in society with this name already exists.',
      });
    }

    const society = await Society.create({
      name: trimmedName,
      slug: `${slug}-${Date.now().toString(36)}`,
      icon: (icon || '').trim() || '🐾',
      creator: req.user._id,
      isBuiltIn: false,
    });

    res.status(201).json({
      success: true,
      message: 'Society created successfully.',
      society: {
        id: society._id.toString(),
        _id: society._id.toString(),
        name: society.name,
        slug: society.slug,
        icon: society.icon,
        members: '1',
        adminId: req.user._id.toString(),
        creator: req.user._id,
        isBuiltIn: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete custom society (reassigns posts to General)
// @route   DELETE /api/community/societies/:id
// @access  Private (Owner or Admin)
export const deleteSociety = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if built-in
    const isBuiltIn = BUILTIN_SOCIETIES.some(
      (b) => b.id === id.toLowerCase() || b.slug === id.toLowerCase() || b.name.toLowerCase() === id.toLowerCase()
    );
    if (isBuiltIn) {
      return res.status(403).json({
        success: false,
        message: 'Built-in societies cannot be deleted.',
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: `Society not found with ID: ${id}`,
      });
    }

    const society = await Society.findById(id);
    if (!society) {
      return res.status(404).json({
        success: false,
        message: 'Society not found.',
      });
    }

    if (society.isBuiltIn) {
      return res.status(403).json({
        success: false,
        message: 'Built-in societies cannot be deleted.',
      });
    }

    // Ownership check: must be creator or admin
    if (society.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the society creator can delete this society.',
      });
    }

    // Preserve posts: Reassign all posts under this society to "General"
    const escapedName = society.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reassignResult = await Post.updateMany(
      { category: new RegExp(`^${escapedName}$`, 'i') },
      { $set: { category: 'General' } }
    );

    // Delete society from MongoDB
    await Society.findByIdAndDelete(society._id);

    res.status(200).json({
      success: true,
      message: 'Society deleted successfully. Posts have been reassigned to General.',
      reassignedPostsCount: reassignResult.modifiedCount || 0,
      societyId: id,
    });
  } catch (error) {
    next(error);
  }
};

