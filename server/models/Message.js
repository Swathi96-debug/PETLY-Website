import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation is required for a message'],
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, 'Role is required (user or assistant)'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    // Media metadata ONLY — no large binary/base64 data stored in MongoDB
    media: {
      name: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      size: { type: Number },
      isVideo: { type: Boolean, default: false },
      url: { type: String, trim: true },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index to fetch a conversation's messages in chronological order
messageSchema.index({ conversation: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
