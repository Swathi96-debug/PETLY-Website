import mongoose from 'mongoose';

const availabilitySlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  startTime: {
    type: String,
    default: '09:00 AM',
  },
  endTime: {
    type: String,
    default: '05:00 PM',
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

const serviceProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service provider name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Service category is required'],
      trim: true,
      index: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative'],
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    image: {
      type: String,
      default: '🏥',
      trim: true,
    },
    imageKey: {
      type: String,
      default: '',
      trim: true,
    },
    exp: {
      type: String,
      default: 'Established',
      trim: true,
    },
    availability: {
      type: [availabilitySlotSchema],
      default: () => [
        { day: 'Monday', startTime: '09:00 AM', endTime: '05:00 PM', isAvailable: true },
        { day: 'Tuesday', startTime: '09:00 AM', endTime: '05:00 PM', isAvailable: true },
        { day: 'Wednesday', startTime: '09:00 AM', endTime: '05:00 PM', isAvailable: true },
        { day: 'Thursday', startTime: '09:00 AM', endTime: '05:00 PM', isAvailable: true },
        { day: 'Friday', startTime: '09:00 AM', endTime: '05:00 PM', isAvailable: true },
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    demoId: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

serviceProviderSchema.index({ category: 1, isActive: 1 });

const ServiceProvider = mongoose.model('ServiceProvider', serviceProviderSchema);

export default ServiceProvider;
