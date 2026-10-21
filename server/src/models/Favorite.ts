import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
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
  },
  {
    timestamps: true,
  }
);

// Compound unique index: a user can only favorite a specific recipe once
FavoriteSchema.index(
  { clerkUserId: 1, 'recipeRef.source': 1, 'recipeRef.externalId': 1 },
  { unique: true }
);

// Compound index for sorted favorites listing
FavoriteSchema.index({ clerkUserId: 1, createdAt: -1 });

export const Favorite = mongoose.model<IFavorite>('Favorite', FavoriteSchema);
