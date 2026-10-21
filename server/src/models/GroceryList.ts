import mongoose, { Schema, Document } from 'mongoose';

export interface IGroceryItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category: string;
  purchased: boolean;
  sourceRecipeId?: string;
  note?: string;
}

export interface IGroceryList extends Document {
  clerkUserId: string;
  name: string;
  sourceRecipeIds: string[];
  items: IGroceryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const GroceryItemSchema = new Schema<IGroceryItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number },
    unit: { type: String },
    category: { type: String, default: 'Other' },
    purchased: { type: Boolean, default: false },
    sourceRecipeId: { type: String },
    note: { type: String },
  },
  { _id: false }
);

const GroceryListSchema = new Schema<IGroceryList>(
  {
    clerkUserId: { type: String, required: true, index: true },
    name: { type: String, required: true, default: 'My Shopping List' },
    sourceRecipeIds: { type: [String], default: [] },
    items: { type: [GroceryItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

GroceryListSchema.index({ clerkUserId: 1, updatedAt: -1 });

export const GroceryList = mongoose.model<IGroceryList>('GroceryList', GroceryListSchema);
