import mongoose, { Schema, Document } from 'mongoose';

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface IMealPlanEntry {
  id: string;
  date: string; // YYYY-MM-DD
  slot: MealSlot;
  recipeRef: {
    source: string;
    externalId: string;
  };
  servings: number;
  snapshot: {
    title: string;
    image?: string;
    cuisine?: string;
    isVeg?: boolean;
    cookTimeMins?: number;
  };
}

export interface IMealPlan extends Document {
  clerkUserId: string;
  weekStart: string; // YYYY-MM-DD representing Monday
  entries: IMealPlanEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const MealPlanEntrySchema = new Schema<IMealPlanEntry>(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    slot: {
      type: String,
      enum: ['breakfast', 'lunch', 'snack', 'dinner'],
      required: true,
    },
    recipeRef: {
      source: { type: String, required: true },
      externalId: { type: String, required: true },
    },
    servings: { type: Number, default: 4 },
    snapshot: {
      title: { type: String, required: true },
      image: { type: String },
      cuisine: { type: String },
      isVeg: { type: Boolean, default: true },
      cookTimeMins: { type: Number },
    },
  },
  { _id: false }
);

const MealPlanSchema = new Schema<IMealPlan>(
  {
    clerkUserId: { type: String, required: true, index: true },
    weekStart: { type: String, required: true },
    entries: { type: [MealPlanEntrySchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// One meal plan document per user per weekStart
MealPlanSchema.index({ clerkUserId: 1, weekStart: 1 }, { unique: true });

export const MealPlan = mongoose.model<IMealPlan>('MealPlan', MealPlanSchema);
