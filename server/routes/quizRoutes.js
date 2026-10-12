import express from 'express';
import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  submitAttempt,
  getMyAttempts,
  getAttemptById,
  saveCompanionMatch,
  getMyCompanionMatches,
  getCompanionMatchById,
} from '../controllers/quizController.js';
import { protect, optionalProtect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

// Question routes
// Public/User can view questions (correctAnswer omitted unless admin)
router.get('/questions', optionalProtect, getQuestions);
router.get('/questions/:id', optionalProtect, getQuestionById);

// Admin-only question creation/modification
router.post('/questions', protect, authorize('admin'), createQuestion);
router.put('/questions/:id', protect, authorize('admin'), updateQuestion);
router.delete('/questions/:id', protect, authorize('admin'), deleteQuestion);

// Knowledge Attempt routes (authenticated user)
router.post('/attempts', protect, submitAttempt);
router.get('/attempts', protect, getMyAttempts);
router.get('/attempts/:id', protect, getAttemptById);

// Companion Match routes (authenticated user - Phase 7 Extension)
router.post('/companion/matches', protect, saveCompanionMatch);
router.get('/companion/matches', protect, getMyCompanionMatches);
router.get('/companion/matches/:id', protect, getCompanionMatchById);

export default router;
