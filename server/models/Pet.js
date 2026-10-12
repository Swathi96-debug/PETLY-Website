import mongoose from 'mongoose';

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pet name is required'],
      trim: true,
    },
    species: {
      type: String,
      required: [true, 'Pet species is required (e.g. Dog, Cat, Rabbit)'],
      trim: true,
    },
    breed: {
      type: String,
      trim: true,
      default: 'Mixed',
    },
    age: {
      type: Number,
      default: 1,
      min: [0, 'Age cannot be negative'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Unknown'],
      default: 'Unknown',
    },
    weight: {
      type: Number,
      default: 0,
      min: [0, 'Weight cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    photoKey: {
      type: String,
      trim: true,
      default: '',
    },
    photoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    healthStatus: {
      type: String,
      trim: true,
      default: 'Healthy',
    },
    temperature: {
      type: String,
      trim: true,
      default: '',
    },
    height: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      trim: true,
      default: '',
    },
    themeColor: {
      type: String,
      trim: true,
      default: 'orange',
    },
    dob: {
      type: String,
      trim: true,
      default: '',
    },
    adoptionDate: {
      type: String,
      trim: true,
      default: '',
    },
    allergies: {
      type: [String],
      default: [],
    },
    medicalConditions: {
      type: [String],
      default: [],
    },
    isAdoptable: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Pet must belong to an owner'],
      index: true,
    },
    adoptionStatus: {
      type: String,
      enum: ['NOT_ADOPTED', 'AVAILABLE', 'PENDING', 'ADOPTED'],
      default: 'NOT_ADOPTED',
      index: true,
    },
    originalOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    preAdoptionSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    adoptionHistory: [
      {
        previousOwner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        newOwner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        application: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AdoptionApplication',
        },
        listing: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AdoptionListing',
        },
        date: {
          type: Date,
          default: Date.now,
        },
        snapshot: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Pet = mongoose.model('Pet', petSchema);

export default Pet;
