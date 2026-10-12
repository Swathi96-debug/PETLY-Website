import express from 'express';
import {
  createHealthRecord,
  getHealthRecords,
  getHealthRecordById,
  updateHealthRecord,
  deleteHealthRecord,
} from '../controllers/healthController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All health record endpoints are protected

router.route('/')
  .post(createHealthRecord)
  .get(getHealthRecords);

router.route('/:id')
  .get(getHealthRecordById)
  .put(updateHealthRecord)
  .delete(deleteHealthRecord);

export default router;
