import express from 'express';
import { protect } from '../middleware/auth.js';
import handleSingleUpload from '../middleware/upload.js';
import {
  uploadFile,
  deleteFile,
  getPresignedUrlController,
} from '../controllers/uploadController.js';

const router = express.Router();

/**
 * @route   POST /api/uploads
 * @desc    Upload file to S3
 * @access  Private
 */
router.post('/', protect, handleSingleUpload('file'), uploadFile);

/**
 * @route   GET /api/uploads/presigned-url
 * @desc    Get secure time-limited presigned URL for private file access
 * @access  Private
 */
router.get('/presigned-url', protect, getPresignedUrlController);

/**
 * @route   DELETE /api/uploads
 * @desc    Delete file from S3 (with user ownership enforcement)
 * @access  Private
 */
router.delete('/', protect, deleteFile);

export default router;
