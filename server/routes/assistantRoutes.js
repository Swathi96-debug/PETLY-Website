import express from 'express';
import {
  chatWithAssistant,
  createConversation,
  getConversations,
  getConversation,
  deleteConversation,
} from '../controllers/assistantController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All assistant endpoints require authentication
router.use(protect);

// Conversation management routes
router.route('/conversations')
  .get(getConversations)
  .post(createConversation);

router.route('/conversations/:id')
  .get(getConversation)
  .delete(deleteConversation);

// @route   POST /api/assistant/chat
router.post('/chat', chatWithAssistant);

export default router;

