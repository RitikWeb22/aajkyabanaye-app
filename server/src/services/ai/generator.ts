import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { Recipe, recipeSchema, Unit } from '../../types/recipe.js';

export interface GenerateRecipeInput {
  prompt?: string;
  ingredients?: string[];
  dietary?: 'veg' | 'non-veg' | 'vegan';
  cuisine?: string;
  servings?: number;
  maxTime?: number;
  exclusions?: string[];
  allergies?: string[];
}

const SYSTEM_PROMPT = `
You are an expert master chef specializing in Indian and global culinary arts for "AajKyaBanaye".
Your task is to invent an authentic, foolproof, delicious recipe strictly honoring the user's pantry, dietary preferences, and exclusions.

CRITICAL RULES:
1. Output valid JSON ONLY. Do not wrap in backticks or markdown fences if possible, or provide raw JSON parseable by JSON.parse.
2. The JSON must conform strictly to this structure:
{
  "title": "Dish Name",
  "description": "Appetizing description of the dish and flavor profile",
  "cuisine": "Indian" (or specified cuisine),
  "category": "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | "other",
  "dietary": {
    "vegetarian": true/false,
    "vegan": true/false,
    "glutenFree": true/false,
    "tags": ["High-Protein", "Comfort Food", etc.]
  },
  "prepTimeMins": number,
  "cookTimeMins": number,
  "servings": number,
  "difficulty": "easy" | "medium" | "hard",
  "ingredients": [
    {
      "id": "ing_1",
      "name": "ingredient name",
      "quantity": number,
      "unit": "g" | "kg" | "ml" | "l" | "pcs" | "tbsp" | "tsp" | "cup" | "pinch" | "to_taste",
      "note": "optional preparation note like chopped or finely diced",
      "groceryTerm": "search term for shopping"
    }
  ],
  "steps": [
    { "order": 1, "text": "Clear, detailed step-by-step instruction." }
  ],
  "tips": ["Chef tip 1", "Chef tip 2"],
  "substitutions": [
    { "ingredient": "original ingredient", "alternatives": ["substitute 1", "substitute 2"] }
  ],
  "allergens": ["dairy", "nuts"] (only if reliably present, otherwise empty array)
}

3. Strict adherence to exclusions: Never include any ingredient or technique listed in exclusions.
4. Food safety & realism: Provide accurate cooking temperatures, times, and measurements.
5. ABSOLUTE DISH PRIORITY: Always create the EXACT dish the user requested in their prompt! If the user asks for "egg bhujiya", "anda bhurji", "chicken biryani", or "fish curry", you MUST formulate that authentic egg or meat dish. NEVER replace eggs with paneer or meat with veggies unless the user explicitly requested a vegetarian substitution!
`;

function getSmartCoverImage(title: string, cuisine = 'Indian', isVeg = true): string {
  const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const lower = cleanTitle.toLowerCase();

  // Curated premium high-res photography matching core dish themes
  if (lower.includes('egg') || lower.includes('bhurji') || lower.includes('bhujiya') || lower.includes('omelet') || lower.includes('anda')) {
    return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('biryani') || lower.includes('pulao')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('paneer') || lower.includes('butter masala') || lower.includes('tikka')) {
    return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('dal') || lower.includes('tadka') || lower.includes('sambar') || lower.includes('khichdi')) {
    return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('dosa') || lower.includes('idli') || lower.includes('uttapam') || lower.includes('vada')) {
    return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('roti') || lower.includes('paratha') || lower.includes('naan') || lower.includes('kulcha')) {
    return 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('pasta') || lower.includes('spaghetti') || lower.includes('macaroni') || lower.includes('penne')) {
    return 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('noodle') || lower.includes('chowmein') || lower.includes('ramen') || lower.includes('maggi')) {
    return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('salad') || lower.includes('sprouts')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('soup') || lower.includes('stew') || lower.includes('broth')) {
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('dessert') || lower.includes('cake') || lower.includes('halwa') || lower.includes('kheer') || lower.includes('sweet') || lower.includes('gulab')) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80';
  }
  if ((lower.includes('chicken') || lower.includes('mutton') || lower.includes('meat') || lower.includes('curry')) && !isVeg) {
    return 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('fish') || lower.includes('prawn') || lower.includes('seafood')) {
    return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('sandwich') || lower.includes('burger') || lower.includes('toast') || lower.includes('wrap') || lower.includes('roll')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('tea') || lower.includes('chai') || lower.includes('coffee') || lower.includes('shake') || lower.includes('smoothie')) {
    return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1000&q=80';
  }
  if (lower.includes('rice') || lower.includes('fried rice')) {
    return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=80';
  }

  // Dynamic AI culinary food photo generator with specific dish prompt
  const encodedPrompt = encodeURIComponent(`${cleanTitle} delicious ${cuisine} food photography 4k professional culinary studio lighting`);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=900&height=600&nologo=true`;
}

export class AiRecipeGenerator {
  private genai: GoogleGenAI | null = null;
  private primaryModel: string;

  constructor() {
    this.primaryModel = env.GEMINI_MODEL || 'gemini-3.8-flash';
    if (env.GEMINI_API_KEY) {
      this.genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  /**
   * Build sanitized prompt enforcing injection hygiene
   */
  public buildPrompt(input: GenerateRecipeInput): string {
    const ingredientsList = input.ingredients && input.ingredients.length > 0
      ? input.ingredients.join(', ')
      : 'Any suitable seasonal kitchen ingredients';

    const exclusionsList = input.exclusions && input.exclusions.length > 0
      ? input.exclusions.join(', ')
      : 'None';

    const allergiesList = input.allergies && input.allergies.length > 0
      ? input.allergies.join(', ')
      : 'None';

    const userPrompt = input.prompt || 'Invent a wholesome, authentic meal';
    const lowerPrompt = userPrompt.toLowerCase();
    const hasEggs = lowerPrompt.includes('egg') || lowerPrompt.includes('anda') || lowerPrompt.includes('bhurji') || lowerPrompt.includes('bhujiya');
    const hasMeat = lowerPrompt.includes('chicken') || lowerPrompt.includes('mutton') || lowerPrompt.includes('fish') || lowerPrompt.includes('prawn') || lowerPrompt.includes('meat');

    let dietInstruction = input.dietary || 'Flexible / Any (strictly match user requested dish)';
    if (hasEggs || hasMeat) {
      dietInstruction = hasEggs ? 'Eggetarian / Egg Dish' : 'Non-Veg';
    }

    return `
Please create a recipe based on the following verified specifications:

<user_specification>
User Request: ${userPrompt}
Must-Use Ingredients: ${ingredientsList}
Dietary Preference: ${dietInstruction}
Preferred Cuisine: ${input.cuisine || 'Indian Homestyle'}
Servings: ${input.servings || 4}
Maximum Total Time: ${input.maxTime ? `${input.maxTime} minutes` : 'Under 35 minutes'}
Strict Exclusions (DO NOT USE): ${exclusionsList}
Allergies: ${allergiesList}
</user_specification>

Remember: Respond ONLY with the requested JSON schema. If the user asked for an egg or meat dish, generate THAT EXACT DISH.
`;
  }

  /**
   * Generate an authentic recipe using Gemini with retry/repair and timeout handling
   */
  async generate(input: GenerateRecipeInput): Promise<{ recipe: Recipe; modelUsed: string }> {
    if (!this.genai) {
      throw new Error('AI Generator is not configured (missing GEMINI_API_KEY in server environment).');
    }

    const promptText = this.buildPrompt(input);
    const candidateModels = Array.from(new Set([
      'gemini-3.8-flash',
      this.primaryModel,
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
    ])).filter(Boolean);

    const perModelTimeoutMs = 12000;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${model} timed out after ${perModelTimeoutMs}ms`)), perModelTimeoutMs)
        );

        const generatePromise = this.genai.models.generateContent({
          model,
          contents: promptText,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.65,
          },
        });

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        const rawJsonText = response.text || '';

        // Clean any markdown backticks if returned
        const cleanedJson = rawJsonText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const parsedData = JSON.parse(cleanedJson);
        const normalized = this.normalizeAndValidate(parsedData, input);

        return {
          recipe: normalized,
          modelUsed: model,
        };
      } catch (err: any) {
        console.warn(`Model ${model} failed, trying next candidate:`, err?.message || err);
        lastError = err;
      }
    }

    throw new Error(
      `Failed to generate AI recipe: ${lastError?.message || 'AI service temporarily unavailable. Please try again.'}`
    );
  }

  /**
   * Validate against Zod recipeSchema and auto-repair missing required fields
   */
  public normalizeAndValidate(data: any, input: GenerateRecipeInput): Recipe {
    const recipeId = `ai:${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Normalize ingredients
    const rawIngredients = Array.isArray(data.ingredients) ? data.ingredients : [];
    const normalizedIngredients = rawIngredients.map((ing: any, idx: number) => ({
      id: ing.id || `ing_${idx + 1}`,
      name: String(ing.name || 'Ingredient').trim(),
      quantity: typeof ing.quantity === 'number' ? ing.quantity : undefined,
      unit: (ing.unit || 'pcs') as Unit,
      note: ing.note ? String(ing.note) : undefined,
      groceryTerm: ing.groceryTerm || ing.name,
      category: ing.category || 'Pantry',
    }));

    // Normalize steps
    const rawSteps = Array.isArray(data.steps) ? data.steps : [];
    const normalizedSteps = rawSteps.map((step: any, idx: number) => ({
      order: typeof step.order === 'number' ? step.order : idx + 1,
      text: String(step.text || step).trim(),
    }));

    const title = String(data.title || 'Chef Special AI Recipe').trim();
    const titleLower = title.toLowerCase();
    const isEggDish = titleLower.includes('egg') || titleLower.includes('anda') || (titleLower.includes('bhurji') && !titleLower.includes('paneer')) || titleLower.includes('bhujiya');
    const isMeatDish = titleLower.includes('chicken') || titleLower.includes('mutton') || titleLower.includes('fish') || titleLower.includes('meat') || titleLower.includes('prawn');
    const isVeg = isEggDish || isMeatDish ? false : (input.dietary === 'veg' || data.dietary?.vegetarian || false);
    const coverImage = data.image && data.image.startsWith('http')
      ? data.image
      : getSmartCoverImage(title, data.cuisine || input.cuisine || 'Indian', isVeg);

    const candidateRecipe: Recipe = {
      id: recipeId,
      source: 'ai',
      title,
      description: data.description ? String(data.description).trim() : 'Bespoke meal formulated by AajKyaBanaye AI.',
      image: coverImage,
      cuisine: data.cuisine || input.cuisine || 'Indian',
      category: data.category || 'dinner',
      dietary: {
        vegetarian: isVeg,
        vegan: Boolean(data.dietary?.vegan),
        glutenFree: Boolean(data.dietary?.glutenFree),
        tags: Array.isArray(data.dietary?.tags) ? data.dietary.tags : ['AI Created', 'Custom'],
      },
      prepTimeMins: typeof data.prepTimeMins === 'number' ? data.prepTimeMins : 10,
      cookTimeMins: typeof data.cookTimeMins === 'number' ? data.cookTimeMins : 20,
      servings: typeof data.servings === 'number' ? data.servings : input.servings || 4,
      difficulty: data.difficulty || 'medium',
      ingredients: normalizedIngredients,
      steps: normalizedSteps,
      tips: Array.isArray(data.tips) ? data.tips : [],
      substitutions: Array.isArray(data.substitutions) ? data.substitutions : [],
      allergens: Array.isArray(data.allergens) ? data.allergens : [],
      isAiGenerated: true,
      attribution: {
        providerName: 'AajKyaBanaye AI',
        license: 'AI generated recipe. Use personal judgment for food safety and allergens.',
      },
    };

    // Strict validation
    const parsed = recipeSchema.safeParse(candidateRecipe);
    if (!parsed.success) {
      console.error('AI Recipe schema validation error:', parsed.error.format());
      throw new Error('AI output did not conform to the recipe schema');
    }

    return parsed.data as Recipe;
  }
}

export const aiRecipeGenerator = new AiRecipeGenerator();
export const generateAiRecipe = async (input: GenerateRecipeInput): Promise<Recipe> => {
  const result = await aiRecipeGenerator.generate(input);
  return result.recipe;
};
