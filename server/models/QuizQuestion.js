import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Quiz category is required'],
      trim: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 2;
        },
        message: 'A question must provide at least 2 options',
      },
      required: [true, 'Options are required'],
    },
    correctAnswer: {
      type: Number,
      required: [true, 'Correct option index is required'],
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

quizQuestionSchema.index({ category: 1, difficulty: 1, isActive: 1 });

const QuizQuestion = mongoose.model('QuizQuestion', quizQuestionSchema);

export default QuizQuestion;
