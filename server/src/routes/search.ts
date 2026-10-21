import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { recipeRegistry } from '../services/recipe-providers/registry.js';
import { parseSearchIntent } from '../services/search/intentParser.js';
import { rankRecipes } from '../services/search/ranking.js';

export const searchRouter = Router();

const POPULAR_SEARCHES = [
  { query: 'Paneer Butter Masala', category: 'Dinner', isVeg: true },
  { query: 'Dal Tadka', category: 'Homestyle', isVeg: true },
  { query: 'Chicken Biryani', category: 'Special', isVeg: false },
  { query: 'Chole Bhature', category: 'Lunch', isVeg: true },
  { query: 'Masala Dosa', category: 'Breakfast', isVeg: true },
  { query: 'Palak Paneer', category: 'Pure Veg', isVeg: true },
  { query: 'Egg Curry', category: 'High Protein', isVeg: false },
  { query: 'Quick dinner under 20 minutes', category: 'Express', isVeg: true },
  { query: 'Aloo Gobi', category: 'Homestyle', isVeg: true },
  { query: 'Vegetable Biryani', category: 'Special', isVeg: true },
];

const SUGGESTION_POOL = [
  ...POPULAR_SEARCHES.map((p) => p.query),
  'Paneer Tikka',
  'Butter Chicken',
  'Matar Paneer',
  'Chicken Tikka Masala',
  'Dal Makhani',
  'Rajma Masala',
  'Kadai Paneer',
  'Aloo Paratha',
  'Poha',
  'Upma',
  'Pav Bhaji',
  'Vegetable Fried Rice',
  'Egg Fried Rice',
  'Pasta Arrabiata',
  'Tomato Soup',
  'Greek Salad',
];

const smartSearchParamsSchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  ingredients: z.string().optional(), // comma-separated e.g. "potato,onion"
  category: z.string().optional(),
  cuisine: z.string().optional(),
  diet: z.enum(['veg', 'non-veg', 'vegan']).optional(),
  maxTime: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
  page: z.string().default('1').transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  limit: z.string().default('12').transform((v) => Math.min(50, Math.max(1, parseInt(v, 10) || 12))),
});

/**
 * GET /search
 * Smart multi-criteria search with Intent Parsing, Fuzzy Ranking, and AI fallback recommendation
 */
searchRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const parsed = smartSearchParamsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: parsed.error.format(),
        },
      });
    }

    const { q, query, ingredients, category, cuisine, diet, maxTime, page, limit } = parsed.data;
    const rawSearchQuery = q || query || '';

    // 1. Run Rules-Based Intent Parsing
    const intent = parseSearchIntent(rawSearchQuery);

    // If explicit query parameters passed, merge with parsed intent
    if (ingredients) {
      const explicitIngs = ingredients.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      intent.ingredients = Array.from(new Set([...intent.ingredients, ...explicitIngs]));
      intent.isIngredientSearch = true;
    }
    if (category) intent.category = category as any;
    if (cuisine) intent.cuisine = cuisine;
    if (diet) intent.diet = diet;
    if (maxTime) intent.maxTime = maxTime;

    // 2. Fetch candidates from providers
    // Build search queries: primary query term + ingredient terms
    const providerQueries: string[] = [];
    if (intent.cleanedQuery) providerQueries.push(intent.cleanedQuery);
    if (intent.ingredients.length > 0) {
      providerQueries.push(...intent.ingredients);
    }
    if (providerQueries.length === 0) {
      providerQueries.push('curry', 'paneer', 'chicken');
    }

    // Query registry for recipes across extracted search terms
    const searchPromises = providerQueries.slice(0, 3).map((term) =>
      recipeRegistry.search({
        query: term,
        category: intent.category,
        cuisine: intent.cuisine,
        diet: intent.diet,
        maxTime: intent.maxTime,
        limit: 20,
      }).catch(() => ({ items: [] }))
    );

    const results = await Promise.all(searchPromises);
    const candidateRecipes = recipeRegistry.deduplicateRecipes(
      results.flatMap((r) => r.items)
    );

    // 3. Rank & Apply Fuzzy Match + Exclusion Penalty
    const { ranked, suggestAi } = rankRecipes(candidateRecipes, intent);

    // Extract recipes from ranked items
    const rankedRecipes = ranked.map((item) => ({
      ...item.recipe,
      matchQuality: item.matchQuality,
      matchedIngredients: item.matchedIngredients,
    }));

    // Pagination
    const total = rankedRecipes.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = rankedRecipes.slice(startIndex, startIndex + limit);

    res.json({
      data: paginatedItems,
      parsedIntent: intent,
      suggestAi,
      pagination: {
        page,
        limit,
        total,
        hasMore: startIndex + limit < total,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /search:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Smart search failed',
      },
    });
  }
});

/**
 * GET /search/suggestions
 * Returns real-time search autocompletions for quick typing
 */
searchRouter.get('/search/suggestions', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    if (!q || q.length < 2) {
      return res.json({ data: [] });
    }

    const matches = SUGGESTION_POOL.filter((term) =>
      term.toLowerCase().includes(q)
    ).slice(0, 8);

    res.json({ data: matches });
  } catch (err) {
    console.error('Error in /search/suggestions:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch suggestions' } });
  }
});

/**
 * GET /search/popular
 * Returns curated popular Indian food queries
 */
searchRouter.get('/search/popular', (_req: Request, res: Response) => {
  res.json({ data: POPULAR_SEARCHES });
});
