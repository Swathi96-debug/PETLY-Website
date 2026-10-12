import express from 'express';
import { lookupPincode } from '../controllers/locationController.js';

const router = express.Router();

router.get('/pincode/:pincode', lookupPincode);

export default router;
