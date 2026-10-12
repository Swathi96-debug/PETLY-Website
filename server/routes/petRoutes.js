import express from 'express';
import {
  createPet,
  getPets,
  getPetById,
  updatePet,
  deletePet,
} from '../controllers/petController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All pet endpoints require authentication

router.route('/')
  .post(createPet)
  .get(getPets);

router.route('/:id')
  .get(getPetById)
  .put(updatePet)
  .delete(deletePet);

export default router;
