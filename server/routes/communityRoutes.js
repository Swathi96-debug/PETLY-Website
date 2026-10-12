import express from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  toggleSavePost,
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getSocieties,
  createSociety,
  deleteSociety,
} from '../controllers/communityController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

// Society routes
router.route('/societies')
  .get(getSocieties)
  .post(protect, createSociety);

router.route('/societies/:id')
  .delete(protect, deleteSociety);

// Post routes
router.route('/posts')
  .get(optionalProtect, getPosts)
  .post(protect, createPost);

router.route('/posts/:id')
  .get(optionalProtect, getPostById)
  .put(protect, updatePost)
  .delete(protect, deletePost);

router.route('/posts/:id/like')
  .post(protect, toggleLike);

router.route('/posts/:id/vote')
  .post(protect, toggleLike);

router.route('/posts/:id/save')
  .post(protect, toggleSavePost);

// Comment routes
router.route('/posts/:postId/comments')
  .get(getComments)
  .post(protect, addComment);

router.route('/comments/:id')
  .put(protect, updateComment)
  .delete(protect, deleteComment);

export default router;
