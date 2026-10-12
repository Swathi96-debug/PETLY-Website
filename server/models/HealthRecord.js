import mongoose from 'mongoose';

export const HEALTH_RECORD_TYPES = [
  'general',
  'vaccination',
  'medication',
  'appointment',
  'weight',
  'diagnosis',
  'other',
];

const healthRecordSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: [true, 'Health record must reference a pet'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Health record must reference an owner'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: HEALTH_RECORD_TYPES,
        message: '{VALUE} is not a valid health record category',
      },
      required: [true, 'Health record category is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    value: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['completed', 'scheduled', 'ongoing', 'overdue', 'upcoming'],
      default: 'completed',
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

const HealthRecord = mongoose.model('HealthRecord', healthRecordSchema);

export default HealthRecord;
