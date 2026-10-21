import { Recipe, RecipeProvider, SearchParams, Paged } from '../../types/recipe.js';
import { TheMealDBProvider } from './themealdb.js';
import { CatalogRecipeProvider } from './catalog.js';
import { SpoonacularProvider } from './spoonacular.js';
import { env } from '../../config/env.js';
import { AiRecipeModel } from '../../models/AiRecipe.js';
import { generateAiRecipe } from '../ai/generator.js';

export class RecipeProviderRegistry {
  private providers: Map<string, RecipeProvider> = new Map();
  private primaryProviderId: string;

  constructor(primaryProviderId = 'themealdb') {
    this.primaryProviderId = primaryProviderId;

    // Register default primary provider
    const mealDb = new TheMealDBProvider();
    this.register(mealDb);

    // Register curated high-demand Indian & global catalog provider
    const catalog = new CatalogRecipeProvider();
    this.register(catalog);

    // Register Spoonacular if configured
    if (env.SPOONACULAR_API_KEY) {
      const spoonacular = new SpoonacularProvider(env.SPOONACULAR_API_KEY);
      this.register(spoonacular);
    }
  }

  register(provider: RecipeProvider) {
    this.providers.set(provider.id, provider);
  }

  get(providerId: string): RecipeProvider | undefined {
    return this.providers.get(providerId);
  }

  getPrimary(): RecipeProvider {
    const primary = this.providers.get(this.primaryProviderId);
    if (primary) return primary;
    // Fallback to first registered
    const first = this.providers.values().next().value;
    if (!first) throw new Error('No recipe providers registered');
    return first;
  }

  /**
   * Helper to deduplicate recipes across providers by normalized title and ID
   */
  public deduplicateRecipes(recipes: Recipe[]): Recipe[] {
    const seen = new Set<string>();
    const result: Recipe[] = [];

    for (const r of recipes) {
      const normalizedKey = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(r.id) && !seen.has(normalizedKey)) {
        seen.add(r.id);
        seen.add(normalizedKey);
        result.push(r);
      }
    }
    return result;
  }

  /**
   * Search across providers (or primary) with deduplication, MongoDB AI cache, and on-demand synthesis
   */
  async search(params: SearchParams): Promise<Paged<Recipe>> {
    const primary = this.getPrimary();
    const query = (params.query || '').trim();
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 12);

    // Query primary (TheMealDB) and catalog
    const catalogProvider = this.providers.get('custom');
    const [primaryResults, catalogResults] = await Promise.all([
      primary.search(params).catch(() => ({ items: [], total: 500, page, limit, hasMore: true })),
      page === 1 && catalogProvider
        ? catalogProvider.search(params).catch(() => ({ items: [], total: 0, page: 1, limit, hasMore: false }))
        : Promise.resolve({ items: [], total: 0, page: 1, limit, hasMore: false }),
    ]);

    let combined = page === 1
      ? [...catalogResults.items, ...primaryResults.items]
      : [...primaryResults.items];

    // If a text search query was provided, also search previous AI-generated recipes in MongoDB
    if (query) {
      try {
        const queryRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const dbAiRecipes = await AiRecipeModel.find({
          $or: [
            { 'recipe.title': queryRegex },
            { 'recipe.cuisine': queryRegex },
            { 'recipe.category': queryRegex },
            { prompt: queryRegex },
            { 'recipe.ingredients.name': queryRegex },
          ],
        })
          .limit(10)
          .lean();

        for (const doc of dbAiRecipes) {
          if (doc && doc.recipe) {
            combined.unshift(doc.recipe as Recipe);
          }
        }
      } catch (dbErr) {
        console.warn('AiRecipeModel search notice:', dbErr);
      }
    }

    combined = this.deduplicateRecipes(combined);

    // UNLIMITED RECIPES: If user searched a specific dish and 0 matches exist, generate with AI on-the-fly!
    if (query && combined.length === 0 && query.length >= 3) {
      try {
        console.log(`[UnlimitedRecipes] Generating on-demand recipe for query: "${query}"...`);
        const aiRecipe = await generateAiRecipe({
          prompt: query,
          dietary: params.diet,
          cuisine: params.cuisine,
          maxTime: params.maxTime,
        });

        if (aiRecipe) {
          combined.push(aiRecipe);

          // Save to MongoDB asynchronously so subsequent searches find it instantly
          AiRecipeModel.create({
            clerkUserId: 'system_unlimited_recipes',
            prompt: query,
            recipe: aiRecipe,
            model: env.GEMINI_MODEL,
          }).catch((saveErr) => console.warn('Failed to cache on-demand AI recipe:', saveErr));
        }
      } catch (aiErr) {
        console.warn('On-demand AI recipe synthesis notice:', aiErr);
      }
    }

    return {
      items: combined.slice(0, limit),
      total: 500,
      page,
      limit,
      hasMore: primaryResults.hasMore ?? true,
    };
  }

  /**
   * Lookup recipe by composite ID (`source:externalId`)
   */
  async getById(fullId: string): Promise<Recipe | null> {
    const colonIdx = fullId.indexOf(':');
    let source = this.primaryProviderId;
    let externalId = fullId;

    if (colonIdx > 0) {
      source = fullId.substring(0, colonIdx);
      externalId = fullId.substring(colonIdx + 1);
    }

    if (source === 'custom') {
      const catalog = this.providers.get('custom');
      if (catalog) {
        const item = await catalog.getById(externalId);
        if (item) return item;
      }
    }

    if (source === 'ai') {
      try {
        const doc = await AiRecipeModel.findOne({
          $or: [
            { 'recipe.id': fullId },
            { 'recipe.id': `ai:${externalId}` },
            ...(/^[0-9a-fA-F]{24}$/.test(externalId) ? [{ _id: externalId }] : []),
          ],
        }).lean();

        if (doc && doc.recipe) {
          return doc.recipe as Recipe;
        }
      } catch (err) {
        console.warn('Error fetching AI recipe from MongoDB:', err);
      }
      return null;
    }

    const provider = this.providers.get(source) || this.getPrimary();
    return await provider.getById(externalId);
  }

  /**
   * Get related recipes for detail view
   */
  async getRelated(recipe: Recipe, limit = 6): Promise<Recipe[]> {
    try {
      let paged = await this.search({
        category: recipe.category,
        cuisine: recipe.cuisine,
        limit: limit + 2,
      });

      let items = paged.items.filter((item) => item.id !== recipe.id);

      if (items.length < limit) {
        // Fallback: search by cuisine or category title
        const cleanCuisine = recipe.cuisine?.toLowerCase().includes('indian') ? 'Indian' : recipe.cuisine;
        const queryTerm = cleanCuisine || recipe.category || 'curry';
        const fallbackPaged = await this.search({
          cuisine: cleanCuisine,
          query: queryTerm,
          limit: limit + 2,
        });

        const newItems = (fallbackPaged.items || []).filter(
          (item) => item.id !== recipe.id && !items.some((existing) => existing.id === item.id)
        );
        items = [...items, ...newItems];
      }

      if (items.length === 0) {
        const generalPaged = await this.search({ limit: limit + 2 });
        items = (generalPaged.items || []).filter((item) => item.id !== recipe.id);
      }

      return this.deduplicateRecipes(items).slice(0, limit);
    } catch {
      return [];
    }
  }
}

export const recipeRegistry = new RecipeProviderRegistry(env.RECIPE_PROVIDER_PRIMARY || 'themealdb');
