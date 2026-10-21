import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { checkAndIncrementQuota, getQuotaStatus } from '../services/ai/quota.js';
import { aiRecipeGenerator } from '../services/ai/generator.js';
import { AiRecipeModel } from '../models/AiRecipe.js';

export const aiRouter = Router();

const generateRecipeSchema = z.object({
  prompt: z.string().max(500).optional(),
  ingredients: z.array(z.string().max(80)).max(30).optional(),
  dietary: z.enum(['veg', 'non-veg', 'vegan']).optional(),
  cuisine: z.string().max(50).optional(),
  servings: z.number().min(1).max(20).optional(),
  maxTime: z.number().min(5).max(300).optional(),
  exclusions: z.array(z.string().max(80)).max(20).optional(),
  allergies: z.array(z.string().max(80)).max(20).optional(),
});

/**
 * POST /ai/recipes/generate
 * AI recipe generation with quota check, rate limiting, and persistence
 */
aiRouter.post('/ai/recipes/generate', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req.ip ? `guest_${req.ip.replace(/[^a-zA-Z0-9]/g, '_')}` : 'guest_anon');

    // 1. Validate request body
    const parsed = generateRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid recipe generation parameters',
          details: parsed.error.format(),
        },
      });
    }

    // 2. Check and atomically increment daily quota
    const quota = await checkAndIncrementQuota(userId);
    if (!quota.allowed) {
      return res.status(429).json({
        error: {
          code: 'AI_QUOTA_EXCEEDED',
          message: `Daily limit of ${quota.limit} AI recipes reached for today. Please try again tomorrow!`,
          details: {
            used: quota.used,
            limit: quota.limit,
            remaining: 0,
            dateKey: quota.dateKey,
          },
        },
      });
    }

    // 3. Generate recipe via Gemini AI service
    const { recipe, modelUsed } = await aiRecipeGenerator.generate(parsed.data);

    // 4. Save to user's AI recipes collection
    await AiRecipeModel.create({
      clerkUserId: userId,
      prompt: parsed.data.prompt || (parsed.data.ingredients || []).join(', ') || 'Custom Recipe',
      recipe,
      model: modelUsed,
    });

    res.status(201).json({
      data: recipe,
      quota: {
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
      },
    });
  } catch (err: any) {
    console.error('Error generating AI recipe:', err);
    res.status(500).json({
      error: {
        code: 'AI_GENERATION_FAILED',
        message: err?.message || 'Failed to generate recipe. Please try again.',
      },
    });
  }
});

/**
 * GET /ai/quota
 * Check authenticated user's current daily AI usage and remaining quota
 */
aiRouter.get('/ai/quota', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId || (req.ip ? `guest_${req.ip.replace(/[^a-zA-Z0-9]/g, '_')}` : 'guest_anon');
    const quota = await getQuotaStatus(userId);

    res.json({
      data: quota,
    });
  } catch (err: any) {
    res.json({
      data: {
        used: 0,
        limit: 5,
        remaining: 5,
        dateKey: new Date().toISOString().split('T')[0],
      },
    });
  }
});

/**
 * GET /me/ai-recipes
 * Retrieve authenticated user's generated AI recipes history
 */
aiRouter.get('/me/ai-recipes', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const recipes = await AiRecipeModel.find({ clerkUserId: userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({
      data: recipes.map((r) => r.recipe),
    });
  } catch (err: any) {
    console.error('Error fetching user AI recipes:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve AI recipe history',
      },
    });
  }
});
