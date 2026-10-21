import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { UserProfile } from '../models/UserProfile.js';
import { uploadAvatarImage, isCloudinaryConfigured } from '../services/cloudinary.js';

export const meRouter = Router();

// Zod validation schema for profile update
const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  dietaryPreferences: z.array(z.string()).optional(),
  favoriteCuisines: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  preferredCookingTimeMins: z.number().min(5).max(300).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  onboardingCompleted: z.boolean().optional(),
  notificationPrefs: z
    .object({
      mealReminders: z.boolean().optional(),
      newRecipes: z.boolean().optional(),
      shoppingAlerts: z.boolean().optional(),
    })
    .optional(),
});

/**
 * GET /me/profile
 * Retrieves or lazily initializes the authenticated user's profile in MongoDB.
 */
meRouter.get('/me/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    let profile = await UserProfile.findOne({ clerkUserId: userId });

    if (!profile) {
      // Lazy initialization on first authenticated request
      profile = await UserProfile.create({
        clerkUserId: userId,
        displayName: '',
        dietaryPreferences: [],
        favoriteCuisines: [],
        allergies: [],
        preferredCookingTimeMins: 30,
        theme: 'system',
        onboardingCompleted: true,
      });
    }

    res.json({
      data: profile,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve profile',
      },
    });
  }
});

/**
 * PUT /me/profile
 * Updates the user's dietary preferences, favorite cuisines, allergies, and settings.
 */
meRouter.put('/me/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile update payload',
          details: parsed.error.format(),
        },
      });
    }

    const updates = parsed.data;

    const profile = await UserProfile.findOneAndUpdate(
      { clerkUserId: userId },
      { $set: updates },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      data: profile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update profile',
      },
    });
  }
});

const uploadAvatarSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
});

/**
 * POST /me/avatar
 * Uploads user profile photo to Cloudinary and saves URL in UserProfile.
 * Gracefully stores image directly if Cloudinary keys are not yet configured in .env.
 */
meRouter.post('/me/avatar', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = uploadAvatarSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Image data is required',
          details: parsed.error.format(),
        },
      });
    }

    const { image } = parsed.data;
    let avatarUrl: string;
    let isCloudinary = false;

    if (isCloudinaryConfigured()) {
      try {
        avatarUrl = await uploadAvatarImage(image, userId);
        isCloudinary = true;
      } catch (cloudErr: any) {
        console.warn('⚠️ Cloudinary upload failed, falling back to local image data:', cloudErr.message);
        avatarUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
      }
    } else {
      console.log('ℹ️ Cloudinary credentials not configured in .env. Storing image as development fallback.');
      avatarUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
    }

    const profile = await UserProfile.findOneAndUpdate(
      { clerkUserId: userId },
      { $set: { avatarUrl } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: {
        avatarUrl,
        profile,
        provider: isCloudinary ? 'cloudinary' : 'local_fallback',
      },
      message: isCloudinary
        ? 'Profile picture uploaded to Cloudinary successfully'
        : 'Profile picture saved (configure CLOUDINARY_CLOUD_NAME in .env for CDN hosting)',
    });
  } catch (error: any) {
    console.error('Error saving avatar:', error);
    res.status(500).json({
      error: {
        code: 'AVATAR_UPLOAD_ERROR',
        message: error?.message || 'Failed to save avatar image',
      },
    });
  }
});

import { RecentlyViewed } from '../models/RecentlyViewed.js';

const postRecentlyViewedSchema = z.object({
  recipeId: z.string(),
  snapshot: z.object({
    title: z.string(),
    image: z.string().optional(),
    cuisine: z.string().optional(),
    isVeg: z.boolean().default(true),
    cookTimeMins: z.number().optional(),
    servings: z.number().optional(),
    difficulty: z.string().optional(),
  }),
});

/**
 * GET /me/recently-viewed
 * Retrieve the latest 30 recently viewed recipes for the authenticated user
 */
meRouter.get('/me/recently-viewed', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const items = await RecentlyViewed.find({ clerkUserId: userId })
      .sort({ viewedAt: -1 })
      .limit(30)
      .lean();

    res.json({
      data: items.map((item) => ({
        id: `${item.recipeRef.source}:${item.recipeRef.externalId}`,
        source: item.recipeRef.source,
        externalId: item.recipeRef.externalId,
        viewedAt: item.viewedAt,
        ...item.snapshot,
      })),
    });
  } catch (error) {
    console.error('Error fetching recently viewed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve recently viewed recipes',
      },
    });
  }
});

/**
 * POST /me/recently-viewed
 * Record a recipe view with minimal snapshot; caps to 30 items
 */
meRouter.post('/me/recently-viewed', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = postRecentlyViewedSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payload',
          details: parsed.error.format(),
        },
      });
    }

    const { recipeId, snapshot } = parsed.data;
    const colonIdx = recipeId.indexOf(':');
    const source = colonIdx > 0 ? recipeId.substring(0, colonIdx) : 'themealdb';
    const externalId = colonIdx > 0 ? recipeId.substring(colonIdx + 1) : recipeId;

    await RecentlyViewed.findOneAndUpdate(
      {
        clerkUserId: userId,
        'recipeRef.source': source,
        'recipeRef.externalId': externalId,
      },
      {
        $set: {
          snapshot,
          viewedAt: new Date(),
        },
      },
      { returnDocument: 'after', upsert: true }
    );

    // Prune entries exceeding 30
    const count = await RecentlyViewed.countDocuments({ clerkUserId: userId });
    if (count > 30) {
      const excess = await RecentlyViewed.find({ clerkUserId: userId })
        .sort({ viewedAt: -1 })
        .skip(30)
        .select('_id')
        .lean();

      if (excess.length > 0) {
        await RecentlyViewed.deleteMany({
          _id: { $in: excess.map((e) => e._id) },
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating recently viewed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to record recently viewed recipe',
      },
    });
  }
});

/**
 * DELETE /me/recently-viewed
 * Clear all recently viewed items for authenticated user
 */
meRouter.delete('/me/recently-viewed', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    await RecentlyViewed.deleteMany({ clerkUserId: userId });
    res.json({ success: true, message: 'Recently viewed history cleared' });
  } catch (error) {
    console.error('Error clearing recently viewed:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear recently viewed recipes',
      },
    });
  }
});

import { Favorite } from '../models/Favorite.js';

const favoriteSchema = z.object({
  recipeId: z.string().min(1, 'recipeId is required'),
  snapshot: z.object({
    title: z.string().min(1, 'title is required'),
    image: z.string().optional(),
    cuisine: z.string().optional(),
    isVeg: z.boolean().default(true),
    cookTimeMins: z.number().optional(),
    servings: z.number().optional(),
    difficulty: z.string().optional(),
  }),
});

/**
 * GET /me/favorites
 * Retrieve all saved favorite recipes for authenticated user
 */
meRouter.get('/me/favorites', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const favorites = await Favorite.find({ clerkUserId: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      data: favorites.map((fav) => ({
        id: `${fav.recipeRef.source}:${fav.recipeRef.externalId}`,
        source: fav.recipeRef.source,
        externalId: fav.recipeRef.externalId,
        createdAt: fav.createdAt,
        ...fav.snapshot,
      })),
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve favorite recipes',
      },
    });
  }
});

/**
 * GET /me/favorites/check
 * Quick check if a recipeId is favorited by the user
 */
meRouter.get('/me/favorites/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const recipeId = req.query.recipeId as string;

    if (!recipeId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'recipeId query parameter is required',
        },
      });
    }

    const colonIdx = recipeId.indexOf(':');
    const source = colonIdx > 0 ? recipeId.substring(0, colonIdx) : 'themealdb';
    const externalId = colonIdx > 0 ? recipeId.substring(colonIdx + 1) : recipeId;

    const exists = await Favorite.exists({
      clerkUserId: userId,
      'recipeRef.source': source,
      'recipeRef.externalId': externalId,
    });

    res.json({
      isFavorited: Boolean(exists),
    });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check favorite status',
      },
    });
  }
});

/**
 * POST /me/favorites
 * Add a recipe to the user's favorites
 */
meRouter.post('/me/favorites', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = favoriteSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid favorite payload',
          details: parsed.error.format(),
        },
      });
    }

    const { recipeId, snapshot } = parsed.data;
    const colonIdx = recipeId.indexOf(':');
    const source = colonIdx > 0 ? recipeId.substring(0, colonIdx) : 'themealdb';
    const externalId = colonIdx > 0 ? recipeId.substring(colonIdx + 1) : recipeId;

    const fav = await Favorite.findOneAndUpdate(
      {
        clerkUserId: userId,
        'recipeRef.source': source,
        'recipeRef.externalId': externalId,
      },
      {
        $set: {
          snapshot,
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: {
        id: `${source}:${externalId}`,
        ...fav.snapshot,
      },
      message: 'Recipe added to favorites',
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to add recipe to favorites',
      },
    });
  }
});

/**
 * DELETE /me/favorites/:recipeId
 * Remove a recipe from the user's favorites
 */
meRouter.delete('/me/favorites/:recipeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const rawRecipeId = req.params.recipeId;
    const recipeId = Array.isArray(rawRecipeId) ? rawRecipeId[0] : rawRecipeId;

    const colonIdx = recipeId.indexOf(':');
    const source = colonIdx > 0 ? recipeId.substring(0, colonIdx) : 'themealdb';
    const externalId = colonIdx > 0 ? recipeId.substring(colonIdx + 1) : recipeId;

    await Favorite.deleteOne({
      clerkUserId: userId,
      'recipeRef.source': source,
      'recipeRef.externalId': externalId,
    });

    res.json({
      success: true,
      message: 'Recipe removed from favorites',
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to remove recipe from favorites',
      },
    });
  }
});


