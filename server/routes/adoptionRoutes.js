import express from 'express';
import {
  createAdoptionListing,
  getAdoptionListings,
  getAdoptionListingById,
  updateAdoptionListing,
  deleteAdoptionListing,
  applyForAdoption,
  getMyApplications,
  getListingApplications,
  updateApplicationStatus,
  deleteApplication,
} from '../controllers/adoptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes for browsing listings
router.get('/', getAdoptionListings);
router.get('/my-applications', protect, getMyApplications);
router.get('/:id', getAdoptionListingById);

// Protected routes for listings management
router.post('/', protect, createAdoptionListing);
router.put('/:id', protect, updateAdoptionListing);
router.delete('/:id', protect, deleteAdoptionListing);

// Protected routes for applications
router.post('/:listingId/apply', protect, applyForAdoption);
router.get('/applications/my', protect, getMyApplications);
router.get('/:listingId/applications', protect, getListingApplications);
router.put('/applications/:id', protect, updateApplicationStatus);
router.delete('/applications/:id', protect, deleteApplication);

export default router;
