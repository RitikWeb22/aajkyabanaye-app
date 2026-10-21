import { Recipe, RecipeProvider, SearchParams, Paged, Ingredient, Step } from '../../types/recipe.js';

const SPOONACULAR_BASE = 'https://api.spoonacular.com/recipes';

export class SpoonacularProvider implements RecipeProvider {
  id = 'spoonacular';
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  capabilities = {
    ingredientSearch: true,
    cuisineFilter: true,
    nutrition: true,
  };

  attribution = {
    name: 'Spoonacular',
    url: 'https://spoonacular.com',
    requirements: 'Powered by Spoonacular Recipe API',
  };

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private async fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Spoonacular returned status ${response.status}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  public normalizeSpoonacular(raw: any): Recipe {
    const id = `spoonacular:${raw.id}`;
    const title = raw.title ? raw.title.trim() : 'Delicious Recipe';
    const cuisine = raw.cuisines && raw.cuisines.length > 0 ? raw.cuisines[0] : 'International';
    const image = raw.image || undefined;

    // Category mapping from dishTypes
    let category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'other' = 'dinner';
    const dishTypes: string[] = (raw.dishTypes || []).map((d: string) => d.toLowerCase());
    if (dishTypes.some((d) => d.includes('breakfast') || d.includes('brunch'))) {
      category = 'breakfast';
    } else if (dishTypes.some((d) => d.includes('dessert'))) {
      category = 'dessert';
    } else if (dishTypes.some((d) => d.includes('snack') || d.includes('appetizer') || d.includes('fingerfood'))) {
      category = 'snack';
    } else if (dishTypes.some((d) => d.includes('lunch'))) {
      category = 'lunch';
    } else if (dishTypes.some((d) => d.includes('dinner') || d.includes('main course') || d.includes('main dish'))) {
      category = 'dinner';
    }

    // Ingredients extraction
    const ingredients: Ingredient[] = [];
    if (Array.isArray(raw.extendedIngredients)) {
      raw.extendedIngredients.forEach((ing: any, idx: number) => {
        const name = ing.nameClean || ing.name || 'Ingredient';
        ingredients.push({
          id: `ing_${ing.id || idx + 1}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          quantity: ing.amount ? Math.round(ing.amount * 100) / 100 : undefined,
          unit: ing.unit ? ing.unit.toLowerCase() : undefined,
          note: ing.original || undefined,
          groceryTerm: ing.nameClean || ing.name || name,
          category: ing.aisle || 'Pantry',
        });
      });
    }

    // Steps extraction
    const steps: Step[] = [];
    if (Array.isArray(raw.analyzedInstructions) && raw.analyzedInstructions.length > 0) {
      const instructionSteps = raw.analyzedInstructions[0].steps || [];
      instructionSteps.forEach((s: any, idx: number) => {
        if (s.step && s.step.trim().length > 0) {
          steps.push({
            order: s.number || idx + 1,
            text: s.step.trim(),
          });
        }
      });
    } else if (raw.instructions && typeof raw.instructions === 'string') {
      const rawSteps = raw.instructions
        .split(/\r?\n/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 5);

      rawSteps.forEach((text: string, idx: number) => {
        steps.push({
          order: idx + 1,
          text,
        });
      });
    }

    const readyMinutes = raw.readyInMinutes || 30;
    const cookTime = Math.max(10, Math.round(readyMinutes * 0.7));
    const prepTime = Math.max(5, readyMinutes - cookTime);

    return {
      id,
      source: 'spoonacular',
      externalId: String(raw.id),
      title,
      description: raw.summary
        ? raw.summary.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
        : `A delicious ${cuisine} recipe with balanced flavors.`,
      image,
      cuisine,
      category,
      dietary: {
        vegetarian: Boolean(raw.vegetarian),
        vegan: Boolean(raw.vegan),
        glutenFree: Boolean(raw.glutenFree),
        tags: [...(raw.cuisines || []), ...(raw.dishTypes || [])],
      },
      prepTimeMins: prepTime,
      cookTimeMins: cookTime,
      servings: raw.servings || 2,
      difficulty: readyMinutes > 45 ? 'hard' : readyMinutes > 25 ? 'medium' : 'easy',
      ingredients,
      steps,
      rating: {
        value: raw.spoonacularScore ? Math.round((raw.spoonacularScore / 20) * 10) / 10 : 4.5,
        count: raw.aggregateLikes || 24,
      },
      attribution: {
        providerName: 'Spoonacular',
        url: raw.sourceUrl || 'https://spoonacular.com',
        license: 'Spoonacular Recipe API',
      },
      isAiGenerated: false,
    };
  }

  async search(params: SearchParams): Promise<Paged<Recipe>> {
    if (!this.isConfigured()) {
      return { items: [], total: 0, page: 1, limit: params.limit || 10, hasMore: false };
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(50, params.limit || 12));
    const offset = (page - 1) * limit;

    try {
      const url = new URL(`${SPOONACULAR_BASE}/complexSearch`);
      url.searchParams.set('apiKey', this.apiKey!);
      url.searchParams.set('number', String(limit));
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('addRecipeInformation', 'true');
      url.searchParams.set('fillIngredients', 'true');

      if (params.query) url.searchParams.set('query', params.query);
      if (params.cuisine) url.searchParams.set('cuisine', params.cuisine);
      if (params.diet === 'veg') url.searchParams.set('diet', 'vegetarian');
      else if (params.diet === 'vegan') url.searchParams.set('diet', 'vegan');
      if (params.maxTime) url.searchParams.set('maxReadyTime', String(params.maxTime));

      const data = await this.fetchJson<{ results: any[]; totalResults: number }>(url.toString());
      const rawResults = data.results || [];
      const items = rawResults.map((raw) => this.normalizeSpoonacular(raw));

      return {
        items,
        total: data.totalResults || items.length,
        page,
        limit,
        hasMore: offset + limit < (data.totalResults || 0),
      };
    } catch (err) {
      console.error('Spoonacular search error:', err);
      return { items: [], total: 0, page, limit, hasMore: false };
    }
  }

  async getById(externalId: string): Promise<Recipe | null> {
    if (!this.isConfigured()) return null;

    try {
      const url = `${SPOONACULAR_BASE}/${encodeURIComponent(externalId)}/information?apiKey=${encodeURIComponent(this.apiKey!)}`;
      const data = await this.fetchJson<any>(url);
      if (!data || !data.id) return null;
      return this.normalizeSpoonacular(data);
    } catch (err) {
      console.error(`Spoonacular getById error for ${externalId}:`, err);
      return null;
    }
  }

  async list(params: { page?: number; limit?: number; category?: string; cuisine?: string }): Promise<Paged<Recipe>> {
    return this.search({
      page: params.page,
      limit: params.limit,
      category: params.category,
      cuisine: params.cuisine,
    });
  }
}
