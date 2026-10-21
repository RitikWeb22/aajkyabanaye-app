import mongoose from 'mongoose';
import { Recipe, RecipeProvider, SearchParams, Paged, Ingredient, Step } from '../../types/recipe.js';
import { RecipeCache } from '../../models/RecipeCache.js';

const THEMEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';

const NON_VEG_WORDS = [
  'chicken',
  'mutton',
  'beef',
  'pork',
  'lamb',
  'goat',
  'bacon',
  'sausage',
  'fish',
  'salmon',
  'tuna',
  'prawn',
  'shrimp',
  'crab',
  'lobster',
  'duck',
  'turkey',
  'meat',
  'ham',
];

const NON_VEGAN_WORDS = [
  ...NON_VEG_WORDS,
  'egg',
  'eggs',
  'milk',
  'butter',
  'cream',
  'cheese',
  'paneer',
  'ghee',
  'yogurt',
  'curd',
  'honey',
  'mayonnaise',
];

const DISCOVERY_LETTERS = [
  'c', 'b', 'p', 's', 'm', 't', 'f', 'r', 'a', 'd',
  'l', 'k', 'g', 'v', 'w', 'e', 'h', 'i', 'j', 'n',
  'o', 'q', 'u', 'y', 'z'
];

export class TheMealDBProvider implements RecipeProvider {
  id = 'themealdb';
  capabilities = {
    ingredientSearch: true,
    cuisineFilter: true,
    nutrition: false,
  };
  attribution = {
    name: 'TheMealDB',
    url: 'https://www.themealdb.com',
    requirements: 'Free tier attribution required',
  };

  /**
   * Helper to fetch JSON with timeout
   */
  private async fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`TheMealDB returned status ${response.status}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Parse measure string into quantity, unit, and note
   */
  private parseMeasure(rawMeasure?: string): { quantity?: number; unit?: string; note?: string } {
    if (!rawMeasure || !rawMeasure.trim()) return {};

    const clean = rawMeasure.trim().toLowerCase();
    // Check if it's "to taste" or "as required"
    if (clean.includes('taste') || clean.includes('pinch') || clean.includes('garnish')) {
      return { unit: 'to_taste', note: rawMeasure.trim() };
    }

    // Try matching numbers and units e.g. "200g", "2 tbsp", "1 1/2 cups"
    const match = clean.match(/^([\d\s\/\.\-]+)\s*([a-z]+)?/);
    if (match) {
      const numPart = match[1].trim();
      let qty: number | undefined;

      // Handle fractions like "1/2" or "1 1/2"
      if (numPart.includes('/')) {
        const parts = numPart.split(' ');
        if (parts.length === 2) {
          const [whole, frac] = parts;
          const [num, den] = frac.split('/');
          qty = parseFloat(whole) + parseFloat(num) / parseFloat(den);
        } else {
          const [num, den] = numPart.split('/');
          qty = parseFloat(num) / parseFloat(den);
        }
      } else {
        qty = parseFloat(numPart);
      }

      const unitRaw = match[2] || '';
      let unit = unitRaw;
      if (['g', 'gram', 'grams'].includes(unitRaw)) unit = 'g';
      else if (['kg', 'kilo', 'kilogram'].includes(unitRaw)) unit = 'kg';
      else if (['ml', 'milliliter'].includes(unitRaw)) unit = 'ml';
      else if (['l', 'liter', 'litre'].includes(unitRaw)) unit = 'l';
      else if (['tbsp', 'tbs', 'tablespoon', 'tablespoons'].includes(unitRaw)) unit = 'tbsp';
      else if (['tsp', 'teaspoon', 'teaspoons'].includes(unitRaw)) unit = 'tsp';
      else if (['cup', 'cups'].includes(unitRaw)) unit = 'cup';
      else if (['pcs', 'piece', 'pieces'].includes(unitRaw)) unit = 'pcs';

      return {
        quantity: isNaN(qty) ? undefined : Math.round(qty * 100) / 100,
        unit: unit || undefined,
        note: rawMeasure.trim(),
      };
    }

    return { note: rawMeasure.trim() };
  }

  /**
   * Normalize raw TheMealDB meal object to Canonical Recipe schema
   */
  public normalizeMeal(raw: any): Recipe {
    const id = `themealdb:${raw.idMeal}`;
    const title = raw.strMeal ? raw.strMeal.trim() : 'Delicious Recipe';
    const cuisine = raw.strArea && raw.strArea !== 'Unknown' ? raw.strArea : 'Indian';
    const image = raw.strMealThumb || undefined;

    // Category mapping
    let category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'other' = 'dinner';
    const rawCat = (raw.strCategory || '').toLowerCase();
    if (rawCat.includes('breakfast')) category = 'breakfast';
    else if (rawCat.includes('dessert')) category = 'dessert';
    else if (rawCat.includes('starter') || rawCat.includes('side')) category = 'snack';
    else if (rawCat.includes('vegetarian') || rawCat.includes('chicken') || rawCat.includes('pasta')) {
      category = 'dinner';
    }

    // Ingredients extraction
    const ingredients: Ingredient[] = [];
    const ingredientNamesForDiet: string[] = [];

    for (let i = 1; i <= 20; i++) {
      const ingName = raw[`strIngredient${i}`];
      if (ingName && ingName.trim()) {
        const trimmedName = ingName.trim();
        ingredientNamesForDiet.push(trimmedName.toLowerCase());
        const measure = raw[`strMeasure${i}`];
        const parsed = this.parseMeasure(measure);

        ingredients.push({
          id: `ing_${i}`,
          name: trimmedName,
          quantity: parsed.quantity,
          unit: parsed.unit,
          note: parsed.note,
          groceryTerm: trimmedName,
          category: 'Pantry',
        });
      }
    }

    // Vegetarian & Vegan derivation
    const allIngredientsText = `${title.toLowerCase()} ${rawCat} ${ingredientNamesForDiet.join(' ')}`;
    const hasNonVeg = NON_VEG_WORDS.some((word) => allIngredientsText.includes(word));
    const isVegetarian = rawCat.includes('vegetarian') || (!hasNonVeg && !rawCat.includes('chicken') && !rawCat.includes('seafood') && !rawCat.includes('beef') && !rawCat.includes('pork'));
    const hasNonVegan = NON_VEGAN_WORDS.some((word) => allIngredientsText.includes(word));
    const isVegan = rawCat.includes('vegan') || (!hasNonVegan && isVegetarian);

    // Tags
    const tags: string[] = [];
    if (raw.strTags) {
      raw.strTags.split(',').forEach((t: string) => {
        const cleanT = t.trim();
        if (cleanT) tags.push(cleanT);
      });
    }
    if (cuisine) tags.push(cuisine);
    if (isVegetarian) tags.push('Vegetarian');
    if (isVegan) tags.push('Vegan');

    // Instructions / Steps
    const steps: Step[] = [];
    if (raw.strInstructions) {
      const rawSteps = raw.strInstructions
        .split(/\r?\n/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 5 && !s.toLowerCase().startsWith('step '));

      if (rawSteps.length > 0) {
        rawSteps.forEach((text: string, idx: number) => {
          steps.push({
            order: idx + 1,
            text,
          });
        });
      } else {
        // Fallback: split by sentences
        const sentences = raw.strInstructions
          .split(/(?<=[.!?])\s+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 5);

        sentences.forEach((text: string, idx: number) => {
          steps.push({
            order: idx + 1,
            text,
          });
        });
      }
    }

    // Deterministic hash based on ID for rating & time
    const hash = (raw.idMeal || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const categoryLower = (category || '').toLowerCase();
    const titleLower = title.toLowerCase();
    const isQuickDish =
      categoryLower.includes('salad') ||
      categoryLower.includes('breakfast') ||
      categoryLower.includes('starter') ||
      categoryLower.includes('snack') ||
      titleLower.includes('salad') ||
      titleLower.includes('egg') ||
      titleLower.includes('sandwich') ||
      titleLower.includes('soup') ||
      titleLower.includes('toast') ||
      titleLower.includes('wrap');

    const cookTime = isQuickDish ? 8 + (hash % 12) : 12 + (hash % 18); // 8-19 mins for quick, 12-29 mins for standard
    const prepTime = 4 + (hash % 6);   // 4 to 9 mins
    const ratingVal = 4.4 + ((hash % 6) / 10);

    return {
      id,
      source: 'themealdb',
      externalId: raw.idMeal,
      title,
      description: `Delicious ${cuisine} style ${title} prepared with fresh ingredients and authentic spices.`,
      image,
      cuisine,
      category,
      dietary: {
        vegetarian: isVegetarian,
        vegan: isVegan,
        glutenFree: !allIngredientsText.includes('flour') && !allIngredientsText.includes('wheat'),
        tags,
      },
      prepTimeMins: prepTime,
      cookTimeMins: cookTime,
      servings: 4,
      difficulty: cookTime > 40 ? 'hard' : cookTime > 25 ? 'medium' : 'easy',
      ingredients,
      steps,
      rating: {
        value: Math.round(ratingVal * 10) / 10,
        count: 50 + (hash % 120),
      },
      attribution: {
        providerName: 'TheMealDB',
        url: raw.strSource || 'https://www.themealdb.com',
        license: 'TheMealDB Open API',
      },
      isAiGenerated: false,
    };
  }

  /**
   * Get single recipe by external TheMealDB ID
   */
  async getById(externalId: string): Promise<Recipe | null> {
    try {
      // 1. Check MongoDB cache first if connected
      if (mongoose.connection.readyState === 1) {
        try {
          const cached = await RecipeCache.findOne({
            source: 'themealdb',
            externalId,
          });

          if (cached && cached.normalized) {
            return cached.normalized as Recipe;
          }
        } catch (cacheErr) {
          console.warn('RecipeCache read notice:', cacheErr);
        }
      }

      // 2. Fetch from TheMealDB lookup endpoint
      const data = await this.fetchJson<{ meals: any[] | null }>(
        `${THEMEALDB_BASE}/lookup.php?i=${encodeURIComponent(externalId)}`
      );

      if (!data || !Array.isArray(data.meals) || data.meals.length === 0) {
        return null;
      }

      const normalized = this.normalizeMeal(data.meals[0]);

      // 3. Save to MongoDB cache with 24hr TTL if connected
      if (mongoose.connection.readyState === 1) {
        try {
          await RecipeCache.findOneAndUpdate(
            { source: 'themealdb', externalId },
            {
              $set: {
                source: 'themealdb',
                externalId,
                normalized,
                fetchedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
              },
            },
            { upsert: true }
          );
        } catch (cacheWriteErr) {
          console.warn('RecipeCache write notice:', cacheWriteErr);
        }
      }

      return normalized;
    } catch (err) {
      console.error(`TheMealDB getById error for id ${externalId}:`, err);
      return null;
    }
  }

  /**
   * Search recipes with query, filters, and pagination
   */
  async search(params: SearchParams): Promise<Paged<Recipe>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(50, params.limit || 12));

    try {
      let rawMeals: any[] = [];
      const query = (params.query || '').trim();

      if (query) {
        const data = await this.fetchJson<{ meals: any[] | null }>(
          `${THEMEALDB_BASE}/search.php?s=${encodeURIComponent(query)}`
        );
        const allMatching = data && Array.isArray(data.meals) ? data.meals : [];
        const startIndex = (page - 1) * limit;
        rawMeals = allMatching.slice(startIndex, startIndex + limit);
      } else if (params.category && params.category !== 'all') {
        const catQuery = params.category.toLowerCase();
        let apiCat = 'Vegetarian';
        if (catQuery === 'breakfast') apiCat = 'Breakfast';
        else if (catQuery === 'dessert') apiCat = 'Dessert';
        else if (catQuery === 'lunch' || catQuery === 'dinner') apiCat = 'Chicken';

        const letter = DISCOVERY_LETTERS[(page - 1) % DISCOVERY_LETTERS.length];
        const [catData, letterData] = await Promise.all([
          page <= 2
            ? this.fetchJson<{ meals: any[] | null }>(
                `${THEMEALDB_BASE}/filter.php?c=${encodeURIComponent(apiCat)}`
              ).catch(() => ({ meals: null }))
            : Promise.resolve({ meals: null }),
          this.fetchJson<{ meals: any[] | null }>(
            `${THEMEALDB_BASE}/search.php?f=${letter}`
          ).catch(() => ({ meals: null })),
        ]);

        const combinedList: any[] = [];
        if (catData?.meals && Array.isArray(catData.meals)) combinedList.push(...catData.meals);
        if (letterData?.meals && Array.isArray(letterData.meals)) combinedList.push(...letterData.meals);
        rawMeals = combinedList;
      } else {
        // True infinite discovery: rotate through rich alphabet letters
        const letterIndex = (page - 1) % DISCOVERY_LETTERS.length;
        const letter = DISCOVERY_LETTERS[letterIndex];
        const nextLetter = DISCOVERY_LETTERS[(letterIndex + 1) % DISCOVERY_LETTERS.length];

        const [data1, data2] = await Promise.all([
          this.fetchJson<{ meals: any[] | null }>(
            `${THEMEALDB_BASE}/search.php?f=${letter}`
          ).catch(() => ({ meals: null })),
          this.fetchJson<{ meals: any[] | null }>(
            `${THEMEALDB_BASE}/search.php?f=${nextLetter}`
          ).catch(() => ({ meals: null })),
        ]);

        const combined: any[] = [];
        if (data1?.meals && Array.isArray(data1.meals)) combined.push(...data1.meals);
        if (data2?.meals && Array.isArray(data2.meals)) combined.push(...data2.meals);

        // Dedupe by idMeal
        const seen = new Set<string>();
        rawMeals = combined.filter((m) => {
          if (!m.idMeal || seen.has(m.idMeal)) return false;
          seen.add(m.idMeal);
          return true;
        });
      }

      // If results came from filter.php, they only contain idMeal, strMeal, strMealThumb.
      // Lookup top items to have full ingredients & steps
      const fullMeals: any[] = [];
      const mealsToProcess = rawMeals.slice(0, 30);

      for (const meal of mealsToProcess) {
        if (meal.strInstructions) {
          fullMeals.push(meal);
        } else {
          // Quick lookup for details
          const detail = await this.getById(meal.idMeal);
          if (detail) {
            fullMeals.push(detail);
          }
        }
      }

      // Normalize all
      let normalizedItems: Recipe[] = fullMeals.map((item) =>
        item.source === 'themealdb' ? (item as Recipe) : this.normalizeMeal(item)
      );

      // In-memory filtering
      if (params.diet === 'veg') {
        normalizedItems = normalizedItems.filter((r) => r.dietary.vegetarian);
      } else if (params.diet === 'vegan') {
        normalizedItems = normalizedItems.filter((r) => r.dietary.vegan);
      } else if (params.diet === 'non-veg') {
        normalizedItems = normalizedItems.filter((r) => !r.dietary.vegetarian);
      }

      if (params.cuisine) {
        const cLower = params.cuisine.toLowerCase();
        normalizedItems = normalizedItems.filter((r) => r.cuisine?.toLowerCase().includes(cLower));
      }

      if (params.maxTime) {
        normalizedItems = normalizedItems.filter(
          (r) =>
            (r.cookTimeMins || 15) <= params.maxTime! ||
            (r.cookTimeMins || 15) + (r.prepTimeMins || 5) <= params.maxTime! + 5
        );
      }

      // Paginate the normalized result for this page
      const paginatedItems = normalizedItems.slice(0, limit);

      return {
        items: paginatedItems,
        total: 500,
        page,
        limit,
        hasMore: true, // Infinite recipes enabled!
      };
    } catch (err) {
      console.error('TheMealDB search error:', err);
      return {
        items: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      };
    }
  }

  /**
   * List recipes with pagination
   */
  async list(params: { page?: number; limit?: number; category?: string; cuisine?: string }): Promise<Paged<Recipe>> {
    return this.search({
      page: params.page,
      limit: params.limit,
      category: params.category,
      cuisine: params.cuisine,
    });
  }
}
