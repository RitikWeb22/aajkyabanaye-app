import mongoose, { Schema } from 'mongoose';
import { Recipe } from '../types/recipe.js';

export interface IAiRecipe {
  clerkUserId: string;
  prompt: string;
  recipe: Recipe;
  model: string;
  createdAt: Date;
}

const AiRecipeSchema = new Schema<IAiRecipe>(
  {
    clerkUserId: {
      type: String,
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    recipe: {
      type: Schema.Types.Mixed,
      required: true,
    },
    model: {
      type: String,
      required: true,
      default: 'gemini',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export const AiRecipeModel = mongoose.model<IAiRecipe>('AiRecipe', AiRecipeSchema);
