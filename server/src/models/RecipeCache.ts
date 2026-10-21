import mongoose, { Schema, Document } from 'mongoose';
import { Recipe } from '../types/recipe.js';

export interface IRecipeCache extends Document {
  source: string;
  externalId: string;
  normalized: Recipe;
  fetchedAt: Date;
  expiresAt: Date;
}

const recipeCacheSchema = new Schema<IRecipeCache>(
  {
    source: {
      type: String,
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      required: true,
      index: true,
    },
    normalized: {
      type: Schema.Types.Mixed,
      required: true,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB automatically purges documents when expiresAt is reached
    },
  },
  {
    timestamps: true,
  }
);

recipeCacheSchema.index({ source: 1, externalId: 1 }, { unique: true });

export const RecipeCache = mongoose.models.RecipeCache || mongoose.model<IRecipeCache>('RecipeCache', recipeCacheSchema);
