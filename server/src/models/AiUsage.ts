import mongoose, { Schema, Document } from 'mongoose';

export interface IAiUsage extends Document {
  clerkUserId: string;
  dateKey: string; // YYYY-MM-DD
  count: number;
  updatedAt: Date;
}

const AiUsageSchema = new Schema<IAiUsage>(
  {
    clerkUserId: {
      type: String,
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one usage record per user per day
AiUsageSchema.index({ clerkUserId: 1, dateKey: 1 }, { unique: true });

export const AiUsageModel = mongoose.model<IAiUsage>('AiUsage', AiUsageSchema);
