import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  subtitle?: string;
  badgeText?: string;
  image?: string;
  action: {
    type: 'category' | 'recipe' | 'search' | 'url';
    value: string;
  };
  buttonText?: string;
  priority: number;
  isActive: boolean;
  activeFrom?: Date;
  activeTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    badgeText: { type: String },
    image: { type: String },
    action: {
      type: {
        type: String,
        enum: ['category', 'recipe', 'search', 'url'],
        default: 'category',
      },
      value: { type: String, required: true },
    },
    buttonText: { type: String, default: 'Explore Now' },
    priority: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    activeFrom: { type: Date },
    activeTo: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active banners sorted by priority
BannerSchema.index({ isActive: 1, priority: 1 });

export const Banner = mongoose.model<IBanner>('Banner', BannerSchema);
