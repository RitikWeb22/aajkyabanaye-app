import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { recipeRegistry } from '../services/recipe-providers/registry.js';

export const recipesRouter = Router();

const searchParamsSchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  category: z.string().optional(),
  cuisine: z.string().optional(),
  diet: z.enum(['veg', 'non-veg', 'vegan']).optional(),
  maxTime: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  page: z.string().default('1').transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  limit: z.string().default('12').transform((v) => Math.min(50, Math.max(1, parseInt(v, 10) || 12))),
});

/**
 * GET /recipes
 * Paginated public recipe discovery with multi-criteria filters
 */
recipesRouter.get('/recipes', async (req: Request, res: Response) => {
  try {
    const parsed = searchParamsSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.format(),
        },
      });
    }

    const { q, query, category, cuisine, diet, maxTime, difficulty, page, limit } = parsed.data;
    const searchQuery = q || query;

    const result = await recipeRegistry.search({
      query: searchQuery,
      category,
      cuisine,
      diet,
      maxTime,
      difficulty,
      page,
      limit,
    });

    res.json({
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /recipes:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch recipes',
      },
    });
  }
});

/**
 * GET /recipes/:id
 * Retrieve single recipe details by composite ID (e.g. `themealdb:52772`)
 */
recipesRouter.get('/recipes/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (!id || id === 'undefined') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Recipe ID is required',
        },
      });
    }

    const recipe = await recipeRegistry.getById(id);

    if (!recipe) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Recipe not found for ID ${id}`,
        },
      });
    }

    res.json({
      data: recipe,
    });
  } catch (err: any) {
    console.error(`Error in GET /recipes/${req.params.id}:`, err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch recipe detail',
      },
    });
  }
});

/**
 * GET /recipes/:id/related
 * Retrieve related recipe recommendations based on cuisine and category
 */
recipesRouter.get('/recipes/:id/related', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const recipe = await recipeRegistry.getById(id);

    if (!recipe) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Recipe not found for ID ${id}`,
        },
      });
    }

    const related = await recipeRegistry.getRelated(recipe, 6);

    res.json({
      data: related,
    });
  } catch (err: any) {
    console.error(`Error in GET /recipes/${req.params.id}/related:`, err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch related recipes',
      },
    });
  }
});
