import mongoose from 'mongoose';

const adoptionListingSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: [true, 'Adoption listing must reference a pet'],
      index: true,
    },
    shelter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Adoption listing must reference the listing creator/shelter'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Listing title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Listing description is required'],
      trim: true,
      maxlength: [2000, 'Listing description cannot exceed 2000 characters'],
    },
    adoptionFee: {
      type: Number,
      default: 0,
      min: [0, 'Adoption fee cannot be negative'],
    },
    requirements: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['available', 'pending', 'adopted', 'withdrawn'],
      default: 'available',
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const AdoptionListing = mongoose.model('AdoptionListing', adoptionListingSchema);

export default AdoptionListing;
