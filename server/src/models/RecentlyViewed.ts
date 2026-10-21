import mongoose, { Schema, Document } from 'mongoose';

export interface IRecentlyViewed extends Document {
  clerkUserId: string;
  recipeRef: {
    source: string;
    externalId: string;
  };
  snapshot: {
    title: string;
    image?: string;
    cuisine?: string;
    isVeg?: boolean;
    cookTimeMins?: number;
    servings?: number;
    difficulty?: string;
  };
  viewedAt: Date;
}

const RecentlyViewedSchema = new Schema<IRecentlyViewed>(
  {
    clerkUserId: { type: String, required: true, index: true },
    recipeRef: {
      source: { type: String, required: true },
      externalId: { type: String, required: true },
    },
    snapshot: {
      title: { type: String, required: true },
      image: { type: String },
      cuisine: { type: String },
      isVeg: { type: Boolean, default: true },
      cookTimeMins: { type: Number },
      servings: { type: Number },
      difficulty: { type: String },
    },
    viewedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

// Compound index for user recently viewed order
RecentlyViewedSchema.index({ clerkUserId: 1, viewedAt: -1 });
// Compound index for upserting single recipe per user
RecentlyViewedSchema.index(
  { clerkUserId: 1, 'recipeRef.source': 1, 'recipeRef.externalId': 1 },
  { unique: true }
);

export const RecentlyViewed = mongoose.model<IRecentlyViewed>(
  'RecentlyViewed',
  RecentlyViewedSchema
);
