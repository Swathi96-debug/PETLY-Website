import mongoose from 'mongoose';

const companionMatchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Companion match must belong to an authenticated user'],
      index: true,
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    primaryRecommendation: {
      type: { type: String, required: true },
      name: { type: String, required: true },
      icon: { type: String, required: true },
      color: { type: String, required: true },
      desc: { type: String, required: true },
      score: { type: Number, required: true, min: 0, max: 100 },
    },
    compatibilityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    alternativeRankings: [
      {
        type: { type: String, required: true },
        name: { type: String, required: true },
        icon: { type: String, required: true },
        color: { type: String, required: true },
        desc: { type: String, default: '' },
        score: { type: Number, required: true, min: 0, max: 100 },
      },
    ],
    allMatches: [
      {
        type: { type: String, required: true },
        name: { type: String, required: true },
        icon: { type: String, required: true },
        color: { type: String, required: true },
        desc: { type: String, default: '' },
        score: { type: Number, required: true, min: 0, max: 100 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CompanionMatch = mongoose.model('CompanionMatch', companionMatchSchema);

export default CompanionMatch;
