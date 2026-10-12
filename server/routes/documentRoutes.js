import express from 'express';
import {
  uploadMedicalDocument,
  getMedicalDocuments,
  getDocumentPresignedUrl,
  deleteMedicalDocument,
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { handleOptionalUpload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect); // All medical document endpoints require authentication

// POST can accept multipart file or JSON with s3Key
router.route('/')
  .post(handleOptionalUpload('file'), uploadMedicalDocument)
  .get(getMedicalDocuments);

router.route('/:id/presigned-url')
  .get(getDocumentPresignedUrl);

router.route('/:id')
  .delete(deleteMedicalDocument);

export default router;
