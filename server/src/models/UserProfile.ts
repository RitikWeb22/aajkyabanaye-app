import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfile extends Document {
  clerkUserId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  dietaryPreferences: string[];
  favoriteCuisines: string[];
  allergies: string[];
  preferredCookingTimeMins: number;
  theme: 'light' | 'dark' | 'system';
  onboardingCompleted: boolean;
  notificationPrefs: {
    mealReminders: boolean;
    newRecipes: boolean;
    shoppingAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    dietaryPreferences: {
      type: [String],
      default: [],
    },
    favoriteCuisines: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    preferredCookingTimeMins: {
      type: Number,
      default: 30,
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    notificationPrefs: {
      mealReminders: { type: Boolean, default: true },
      newRecipes: { type: Boolean, default: true },
      shoppingAlerts: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
