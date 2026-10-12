import mongoose from 'mongoose';

const societySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Society name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Society slug is required'],
      trim: true,
      lowercase: true,
    },
    icon: {
      type: String,
      default: '🐾',
      trim: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    membersCount: {
      type: Number,
      default: 1,
    },
    isBuiltIn: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

societySchema.index({ slug: 1 });

const Society = mongoose.model('Society', societySchema);

export default Society;
