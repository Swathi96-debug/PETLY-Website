import ServiceProvider from '../models/ServiceProvider.js';
import ServiceBooking from '../models/ServiceBooking.js';
import Review from '../models/Review.js';
import Pet from '../models/Pet.js';
import Notification from '../models/Notification.js';
import { isValidObjectId } from '../utils/validateObjectId.js';
import { generatePresignedUrl } from '../utils/s3Uploader.js';
import { isS3Configured } from '../config/s3.js';

// Attach presigned imageUrl to a provider object if it has an imageKey
const attachProviderImageUrl = async (providerObj) => {
  if (providerObj.imageKey && isS3Configured()) {
    try {
      providerObj.imageUrl = await generatePresignedUrl(providerObj.imageKey, 3600);
    } catch (err) {
      console.warn(`[Services] Could not generate presigned URL for key ${providerObj.imageKey}:`, err.message);
    }
  }
  return providerObj;
};

// ==========================================
// SERVICE PROVIDERS (CATALOG & DETAILS)
// ==========================================

// @desc    Get all active service providers
// @route   GET /api/services/providers
// @access  Public
export const getServiceProviders = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };

    if (category && category !== 'all') {
      filter.category = category.toLowerCase().trim();
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const providers = await ServiceProvider.find(filter).sort({ rating: -1, createdAt: -1 });

    // Attach presigned image URLs for providers with imageKey
    const providersWithImages = await Promise.all(
      providers.map((p) => attachProviderImageUrl(p.toObject()))
    );

    res.status(200).json({
      success: true,
      count: providersWithImages.length,
      providers: providersWithImages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single service provider by ID
// @route   GET /api/services/providers/:id
// @access  Public
export const getServiceProviderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Service Provider ID: ${id}`,
      });
    }

    const provider = await ServiceProvider.findById(id);
    if (!provider || (!provider.isActive && (!req.user || req.user.role !== 'admin'))) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found.',
      });
    }

    const providerObj = await attachProviderImageUrl(provider.toObject());

    res.status(200).json({
      success: true,
      provider: providerObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create service provider
// @route   POST /api/services/providers
// @access  Private (Admin only)
export const createServiceProvider = async (req, res, next) => {
  try {
    const { name, category, price, bio, description, exp, image, imageKey, availability, rating } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and base price are required.',
      });
    }

    const provider = await ServiceProvider.create({
      name: name.trim(),
      category: category.toLowerCase().trim(),
      price: Number(price),
      bio: bio || '',
      description: description || '',
      exp: exp || 'Established',
      image: image || '🏥',
      imageKey: imageKey || '',
      availability: Array.isArray(availability) ? availability : undefined,
      rating: rating !== undefined ? Number(rating) : 5.0,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Service provider created successfully.',
      provider,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service provider
// @route   PUT /api/services/providers/:id
// @access  Private (Admin only)
export const updateServiceProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Service Provider ID: ${id}`,
      });
    }

    const provider = await ServiceProvider.findById(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found.',
      });
    }

    const allowedFields = ['name', 'category', 'price', 'bio', 'description', 'exp', 'image', 'imageKey', 'availability', 'rating', 'isActive'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        provider[field] = req.body[field];
      }
    });

    const updated = await provider.save();

    res.status(200).json({
      success: true,
      message: 'Service provider updated successfully.',
      provider: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service provider
// @route   DELETE /api/services/providers/:id
// @access  Private (Admin only)
export const deleteServiceProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Service Provider ID: ${id}`,
      });
    }

    const provider = await ServiceProvider.findByIdAndDelete(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service provider deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get provider availability slots
// @route   GET /api/services/providers/:id/availability
// @access  Public
export const getServiceProviderAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Service Provider ID: ${id}`,
      });
    }

    const provider = await ServiceProvider.findById(id).select('availability name category');
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found.',
      });
    }

    res.status(200).json({
      success: true,
      availability: provider.availability || [],
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get provider availability slots
// @route   GET /api/services/providers/:id/availability
// @access  Public
export const getProviderAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Service Provider ID: ${id}`,
      });
    }

    const provider = await ServiceProvider.findById(id).select('availability name category');
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found.',
      });
    }

    res.status(200).json({
      success: true,
      providerId: id,
      name: provider.name,
      availability: provider.availability || [],
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SERVICE BOOKINGS (AUTHENTICATED USER)
// ==========================================

// @desc    Create new service booking
// @route   POST /api/services/bookings
// @access  Private
export const createServiceBooking = async (req, res, next) => {
  try {
    const { providerId, serviceName, petId, petName, date, time, notes } = req.body;

    if (!providerId || !serviceName || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID, service name, booking date, and time are required.',
      });
    }

    if (!isValidObjectId(providerId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Provider ID: ${providerId}`,
      });
    }

    const provider = await ServiceProvider.findById(providerId);
    if (!provider || !provider.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found or inactive.',
      });
    }

    let resolvedPetName = petName || 'Companion';
    let resolvedPet = null;
    if (petId && isValidObjectId(petId)) {
      const petDoc = await Pet.findById(petId);
      if (petDoc) {
        resolvedPet = petDoc._id;
        resolvedPetName = petDoc.name;
      }
    }

    // Freeze price at time of booking!
    const frozenPrice = provider.price;

    const booking = await ServiceBooking.create({
      user: req.user._id,
      provider: provider._id,
      providerName: provider.name,
      serviceName: serviceName.trim(),
      category: provider.category,
      pet: resolvedPet,
      petName: resolvedPetName,
      date,
      time,
      price: frozenPrice,
      notes: notes || '',
      status: 'Confirmed',
    });

    // Notify user with booking information and prevent duplicate notifications
    let petDetail = '';
    if (resolvedPetName && resolvedPetName !== 'Companion') {
      petDetail = ` for ${resolvedPetName}`;
    } else if (petName && typeof petName === 'string' && petName.trim()) {
      petDetail = ` for ${petName.trim()}`;
    }

    const trimmedServiceName = serviceName.trim();
    const notificationMessage = `Your booking for "${trimmedServiceName}" with ${provider.name}${petDetail} on ${date} at ${time} is confirmed.`;

    const bookingIdStr = booking._id.toString();

    const existingNotif = await Notification.findOne({
      user: req.user._id,
      'metadata.bookingId': bookingIdStr,
    });

    if (!existingNotif) {
      await Notification.create({
        user: req.user._id,
        type: 'service',
        title: 'Service Booking Confirmed',
        message: notificationMessage,
        link: '/services',
        metadata: {
          bookingId: bookingIdStr,
          providerId: provider._id.toString(),
          providerName: provider.name,
          serviceName: trimmedServiceName,
          petId: resolvedPet ? resolvedPet.toString() : null,
          petName: (resolvedPetName && resolvedPetName !== 'Companion') ? resolvedPetName : (petName ? petName.trim() : undefined),
          date,
          time,
        },
      }).catch((err) => {
        console.error('[Services] Failed to create booking notification:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Service booking created successfully.',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's service bookings
// @route   GET /api/services/bookings
// @access  Private
export const getServiceBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'admin' && req.query.all === 'true') {
      // Admin viewing all bookings
    } else {
      filter.user = req.user._id;
    }

    const bookings = await ServiceBooking.find(filter)
      .populate('provider', 'name category image imageKey rating price')
      .populate('pet', 'name species breed')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single service booking by ID
// @route   GET /api/services/bookings/:id
// @access  Private
export const getServiceBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Booking ID: ${id}`,
      });
    }

    const booking = await ServiceBooking.findById(id)
      .populate('provider', 'name category image imageKey rating price')
      .populate('pet', 'name species breed');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Strict ownership verification
    const isOwner = booking.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own bookings.',
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status
// @route   PUT /api/services/bookings/:id/status
// @access  Private (Owner can cancel; Admin can set any status)
export const updateServiceBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Booking ID: ${id}`,
      });
    }

    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const booking = await ServiceBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Users can only cancel their own bookings
    if (!isAdmin && (!isOwner || status !== 'Cancelled')) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own bookings.',
      });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel / Delete booking
// @route   DELETE /api/services/bookings/:id
// @access  Private
export const deleteServiceBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Booking ID: ${id}`,
      });
    }

    const booking = await ServiceBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only cancel your own bookings.',
      });
    }

    booking.status = 'Cancelled';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully.',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SERVICE PROVIDER REVIEWS
// ==========================================

// Helper to recalculate provider rating & reviewsCount
const recalculateProviderRating = async (providerId) => {
  const reviews = await Review.find({ targetType: 'service_provider', targetId: providerId });
  const reviewsCount = reviews.length;
  let rating = 5.0;
  if (reviewsCount > 0) {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    rating = Math.round((sum / reviewsCount) * 10) / 10;
  }
  await ServiceProvider.findByIdAndUpdate(providerId, { rating, reviewsCount });
};

// @desc    Get reviews for a service provider
// @route   GET /api/services/providers/:providerId/reviews
// @access  Public
export const getServiceProviderReviews = async (req, res, next) => {
  try {
    const { providerId } = req.params;
    if (!isValidObjectId(providerId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Provider ID: ${providerId}`,
      });
    }

    const reviews = await Review.find({ targetType: 'service_provider', targetId: providerId })
      .populate('user', 'fullName avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create review for a service provider
// @route   POST /api/services/providers/:providerId/reviews
// @access  Private
export const createServiceProviderReview = async (req, res, next) => {
  try {
    const { providerId } = req.params;
    const { rating, reviewText } = req.body;

    if (!isValidObjectId(providerId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Provider ID: ${providerId}`,
      });
    }

    const provider = await ServiceProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found.',
      });
    }

    if (!rating || !reviewText) {
      return res.status(400).json({
        success: false,
        message: 'Rating (1-5) and review text are required.',
      });
    }

    // Check if user already reviewed this provider
    const existingReview = await Review.findOne({
      targetType: 'service_provider',
      targetId: providerId,
      user: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this provider. Please update your existing review.',
      });
    }

    const review = await Review.create({
      user: req.user._id,
      targetType: 'service_provider',
      targetId: providerId,
      serviceProvider: providerId,
      rating: Number(rating),
      reviewText: reviewText.trim(),
    });

    await recalculateProviderRating(providerId);

    res.status(201).json({
      success: true,
      message: 'Review created successfully.',
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review for a service provider
// @route   PUT /api/services/reviews/:id
// @access  Private (Owner only)
export const updateServiceProviderReview = async (req, res, next) => {
  try {
    const id = req.params.id || req.params.reviewId;
    const { rating, reviewText } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Review ID: ${id}`,
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    // Strict ownership verification: only review owner can update
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own reviews.',
      });
    }

    if (rating !== undefined) {
      const parsedRating = Number(rating);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be a number between 1 and 5.',
        });
      }
      review.rating = parsedRating;
    }

    if (reviewText !== undefined) {
      if (!reviewText.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Review text cannot be empty.',
        });
      }
      review.reviewText = reviewText.trim();
    }

    await review.save();

    // Recalculate provider rating & reviewsCount
    const providerId = review.targetId || review.serviceProvider;
    if (providerId) {
      await recalculateProviderRating(providerId);
    }

    res.status(200).json({
      success: true,
      message: 'Review updated successfully.',
      review,
    });
  } catch (error) {
    next(error);
  }
};
