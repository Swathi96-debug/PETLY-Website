import mongoose from 'mongoose';

const medicalDocumentSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: [true, 'Medical document must belong to a pet'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Medical document must have an owner'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['lab_result', 'prescription', 'vaccine_certificate', 'xray', 'insurance', 'other'],
      default: 'other',
    },
    s3Key: {
      type: String,
      required: [true, 'S3 object key is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    contentType: {
      type: String,
      required: [true, 'Content MIME type is required'],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isHistorical: {
      type: Boolean,
      default: false,
      index: true,
    },
    preAdoptionOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const MedicalDocument = mongoose.model('MedicalDocument', medicalDocumentSchema);

export default MedicalDocument;
