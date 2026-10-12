import express from 'express';
import {
  getServiceProviders,
  getServiceProviderById,
  getServiceProviderAvailability,
  createServiceProvider,
  updateServiceProvider,
  deleteServiceProvider,
  createServiceBooking,
  getServiceBookings,
  getServiceBookingById,
  updateServiceBookingStatus,
  deleteServiceBooking,
  getServiceProviderReviews,
  createServiceProviderReview,
  updateServiceProviderReview
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Service Providers
router.route('/providers')
  .get(getServiceProviders)
  .post(protect, authorize('admin'), createServiceProvider);

router.route('/providers/:id')
  .get(getServiceProviderById)
  .put(protect, authorize('admin'), updateServiceProvider)
  .delete(protect, authorize('admin'), deleteServiceProvider);

router.get('/providers/:id/availability', getServiceProviderAvailability);

// Bookings
router.route('/bookings')
  .post(protect, createServiceBooking)
  .get(protect, getServiceBookings);

router.route('/bookings/:id')
  .get(protect, getServiceBookingById)
  .delete(protect, deleteServiceBooking);

router.put('/bookings/:id/status', protect, updateServiceBookingStatus);

// Reviews for Service Provider
router.route('/providers/:providerId/reviews')
  .get(getServiceProviderReviews)
  .post(protect, createServiceProviderReview);

router.put('/reviews/:id', protect, updateServiceProviderReview);
router.put('/providers/:providerId/reviews/:reviewId', protect, updateServiceProviderReview);

export default router;
