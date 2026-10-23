import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { MealPlan, MealSlot } from '../models/MealPlan.js';
import { GroceryList } from '../models/GroceryList.js';
import { UserProfile } from '../models/UserProfile.js';
import { recipeRegistry } from '../services/recipe-providers/registry.js';
import { inferCategory } from '../services/grocery/copyList.js';

export const mealPlansRouter = Router();

function getMondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

const mealEntrySchema = z.object({
  weekStart: z.string().min(10, 'weekStart format YYYY-MM-DD'),
  date: z.string().min(10, 'date format YYYY-MM-DD'),
  slot: z.enum(['breakfast', 'lunch', 'snack', 'dinner']),
  recipeId: z.string().min(1),
  servings: z.number().min(1).default(4),
  snapshot: z.object({
    title: z.string().min(1),
    image: z.string().optional(),
    cuisine: z.string().optional(),
    isVeg: z.boolean().default(true),
    cookTimeMins: z.number().optional(),
  }),
});

/**
 * GET /me/meal-plans
 * Fetch meal plan for a specific week (weekStart: YYYY-MM-DD)
 */
mealPlansRouter.get('/me/meal-plans', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const weekStart = (req.query.weekStart as string) || getMondayOfCurrentWeek();

    let plan = await MealPlan.findOne({ clerkUserId: userId, weekStart }).lean();

    if (!plan) {
      plan = await MealPlan.create({
        clerkUserId: userId,
        weekStart,
        entries: [],
      });
    }

    res.json({
      data: {
        id: (plan as any)._id?.toString(),
        weekStart: plan.weekStart,
        entries: plan.entries || [],
      },
    });
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve meal plan',
      },
    });
  }
});

/**
 * POST /me/meal-plans/entry
 * Add or update a slot entry in the week's meal plan
 */
mealPlansRouter.post('/me/meal-plans/entry', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = mealEntrySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid meal plan entry payload',
          details: parsed.error.format(),
        },
      });
    }

    const { weekStart, date, slot, recipeId, servings, snapshot } = parsed.data;

    const colonIdx = recipeId.indexOf(':');
    const source = colonIdx > 0 ? recipeId.substring(0, colonIdx) : 'themealdb';
    const externalId = colonIdx > 0 ? recipeId.substring(colonIdx + 1) : recipeId;

    const entryId = `entry_${date}_${slot}`;
    const newEntry = {
      id: entryId,
      date,
      slot: slot as MealSlot,
      recipeRef: { source, externalId },
      servings,
      snapshot,
    };

    // Find meal plan and remove any existing entry for that date and slot
    let plan = await MealPlan.findOne({ clerkUserId: userId, weekStart });
    if (!plan) {
      plan = new MealPlan({
        clerkUserId: userId,
        weekStart,
        entries: [newEntry],
      });
    } else {
      // Filter out existing slot for that specific date
      plan.entries = plan.entries.filter((e) => !(e.date === date && e.slot === slot)) as any;
      plan.entries.push(newEntry as any);
    }

    await plan.save();

    res.json({
      success: true,
      data: newEntry,
      message: 'Meal plan updated successfully',
    });
  } catch (error) {
    console.error('Error adding meal plan entry:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update meal plan',
      },
    });
  }
});

/**
 * DELETE /me/meal-plans/entry/:entryId
 * Remove a planned slot
 */
mealPlansRouter.delete('/me/meal-plans/entry/:entryId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { entryId } = req.params;
    const weekStart = (req.query.weekStart as string) || getMondayOfCurrentWeek();

    const plan = await MealPlan.findOne({ clerkUserId: userId, weekStart });
    if (!plan) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Meal plan not found',
        },
      });
    }

    plan.entries = plan.entries.filter((e) => e.id !== entryId) as any;
    await plan.save();

    res.json({
      success: true,
      message: 'Meal removed from plan',
    });
  } catch (error) {
    console.error('Error deleting meal plan entry:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete meal plan entry',
      },
    });
  }
});

/**
 * POST /me/meal-plans/suggest
 * Suggest recipes for empty slots in a meal plan based on preferences
 */
mealPlansRouter.post('/me/meal-plans/suggest', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { date, slot } = req.body;

    // Check user dietary preferences if user is authenticated
    let isVeg = true;
    if (userId) {
      const profile = await UserProfile.findOne({ clerkUserId: userId }).lean();
      if (profile?.dietaryPreferences && profile.dietaryPreferences.length > 0) {
        isVeg = profile.dietaryPreferences.some((p) =>
          p.toLowerCase().includes('veg') && !p.toLowerCase().includes('non')
        );
      }
    }

    // Slot-specific search queries that guarantee high quality results from recipe providers
    const slotKeywords: Record<string, string[]> = {
      breakfast: ['pancake', 'egg', 'bread', 'toast', 'omelette'],
      lunch: isVeg ? ['paneer', 'rice', 'curry', 'dal', 'salad'] : ['chicken', 'curry', 'rice', 'fish'],
      snack: ['sandwich', 'salad', 'potato', 'soup', 'bread'],
      dinner: isVeg ? ['curry', 'soup', 'dal', 'rice', 'paneer'] : ['curry', 'stew', 'chicken', 'soup'],
    };

    const targetSlot = (slot || 'dinner').toLowerCase();
    const candidateQueries = slotKeywords[targetSlot] || ['curry', 'rice', 'salad'];

    const foundRecipes: any[] = [];
    for (const q of candidateQueries) {
      if (foundRecipes.length >= 12) break;
      try {
        const paged = await recipeRegistry.search({
          query: q,
          diet: isVeg ? 'veg' : undefined,
          limit: 8,
        });
        if (paged?.items?.length) {
          for (const item of paged.items) {
            if (!foundRecipes.some((r) => r.id === item.id)) {
              foundRecipes.push(item);
            }
          }
        }
      } catch (err) {
        // try next query candidate
      }
    }

    // Fallback if needed
    if (foundRecipes.length < 6) {
      try {
        const fallbackPaged = await recipeRegistry.search({
          query: 'curry',
          limit: 8,
        });
        if (fallbackPaged?.items?.length) {
          for (const item of fallbackPaged.items) {
            if (!foundRecipes.some((r) => r.id === item.id)) {
              foundRecipes.push(item);
            }
          }
        }
      } catch (err) {
        // ignore
      }
    }

    const suggestions = foundRecipes.slice(0, 12).map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image,
      cuisine: r.cuisine || 'World / Fusion',
      isVeg: Boolean(r.dietary?.vegetarian),
      cookTimeMins: (r.cookTimeMins || 25) + (r.prepTimeMins || 10),
      servings: r.servings || 4,
    }));

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Error generating meal suggestions:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate suggestions',
      },
    });
  }
});

/**
 * POST /me/meal-plans/grocery-list
 * Consolidates all ingredients across a week's meal plan into a GroceryList
 */
mealPlansRouter.post('/me/meal-plans/grocery-list', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const weekStart = req.body.weekStart || getMondayOfCurrentWeek();
    const customTitle = req.body.title || `Weekly Groceries (Week of ${weekStart})`;

    const plan = await MealPlan.findOne({ clerkUserId: userId, weekStart }).lean();

    if (!plan || !plan.entries || plan.entries.length === 0) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_MEAL_PLAN',
          message: 'No meals scheduled in this plan. Add some meals before generating a grocery list.',
        },
      });
    }

    const aggregatedMap = new Map<string, {
      name: string;
      quantity: number;
      unit: string;
      category: string;
      sources: string[];
    }>();

    const recipeIds: string[] = [];

    for (const entry of plan.entries) {
      const fullId = `${entry.recipeRef.source}:${entry.recipeRef.externalId}`;
      recipeIds.push(fullId);

      try {
        const recipe = await recipeRegistry.getById(fullId);
        if (!recipe || !recipe.ingredients) continue;

        const baseServings = recipe.servings || 4;
        const targetServings = entry.servings || 4;
        const scaleFactor = targetServings / baseServings;

        for (const ing of recipe.ingredients) {
          const key = ing.name.toLowerCase().trim();
          const baseQty = (ing.quantity || 1) * scaleFactor;
          const unit = ing.unit || 'pcs';
          const category = inferCategory(ing.name, ing.category);

          if (aggregatedMap.has(key)) {
            const existing = aggregatedMap.get(key)!;
            // Add quantity if units match
            if (existing.unit === unit) {
              existing.quantity += baseQty;
            }
            if (!existing.sources.includes(recipe.title)) {
              existing.sources.push(recipe.title);
            }
          } else {
            aggregatedMap.set(key, {
              name: ing.groceryTerm || ing.name,
              quantity: Math.round(baseQty * 10) / 10,
              unit,
              category,
              sources: [recipe.title],
            });
          }
        }
      } catch (err) {
        console.warn(`Could not load recipe ${fullId} for grocery consolidation:`, err);
      }
    }

    const items = Array.from(aggregatedMap.values()).map((agg, idx) => ({
      id: `item_${Date.now()}_${idx}`,
      name: agg.name,
      quantity: agg.quantity,
      unit: agg.unit,
      category: agg.category,
      purchased: false,
      note: `For ${agg.sources.slice(0, 2).join(', ')}${agg.sources.length > 2 ? ` +${agg.sources.length - 2} more` : ''}`,
    }));

    const groceryList = await GroceryList.create({
      clerkUserId: userId,
      name: customTitle,
      sourceRecipeIds: Array.from(new Set(recipeIds)),
      items,
    });

    res.status(201).json({
      success: true,
      data: {
        id: groceryList._id.toString(),
        name: groceryList.name,
        itemCount: groceryList.items.length,
        items: groceryList.items,
        createdAt: groceryList.createdAt,
      },
      message: `Generated grocery list with ${items.length} items from planned meals`,
    });
  } catch (error) {
    console.error('Error generating grocery list from meal plan:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate grocery list from meal plan',
      },
    });
  }
});
