import { z } from 'zod';

export type Unit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'pcs'
  | 'tbsp'
  | 'tsp'
  | 'cup'
  | 'pinch'
  | 'to_taste';

export const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
  groceryTerm: z.string().optional(),
  category: z.string().optional(),
});

export type Ingredient = z.infer<typeof ingredientSchema>;

export const stepSchema = z.object({
  order: z.number(),
  text: z.string(),
});

export type Step = z.infer<typeof stepSchema>;

export const recipeSchema = z.object({
  id: z.string(),
  source: z.enum(['themealdb', 'spoonacular', 'ai', 'custom']),
  externalId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  cuisine: z.string().optional(),
  category: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'other']).optional(),
  dietary: z.object({
    vegetarian: z.boolean(),
    vegan: z.boolean().optional(),
    glutenFree: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
  }),
  prepTimeMins: z.number().optional(),
  cookTimeMins: z.number().optional(),
  servings: z.number().default(2),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  ingredients: z.array(ingredientSchema).default([]),
  steps: z.array(stepSchema).default([]),
  tips: z.array(z.string()).optional(),
  substitutions: z
    .array(
      z.object({
        ingredient: z.string(),
        alternatives: z.array(z.string()),
      })
    )
    .optional(),
  allergens: z.array(z.string()).optional(),
  rating: z.object({ value: z.number(), count: z.number() }).optional(),
  attribution: z
    .object({
      providerName: z.string(),
      url: z.string().optional(),
      license: z.string().optional(),
    })
    .optional(),
  isAiGenerated: z.boolean().default(false),
});

export type Recipe = z.infer<typeof recipeSchema>;

export interface SearchParams {
  query?: string;
  category?: string;
  cuisine?: string;
  diet?: 'veg' | 'non-veg' | 'vegan';
  maxTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  ingredients?: string[];
  page?: number;
  limit?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface RecipeProvider {
  id: string;
  search(params: SearchParams): Promise<Paged<Recipe>>;
  getById(externalId: string): Promise<Recipe | null>;
  list(params: { page?: number; limit?: number; category?: string; cuisine?: string }): Promise<Paged<Recipe>>;
  capabilities: {
    ingredientSearch: boolean;
    cuisineFilter: boolean;
    nutrition: boolean;
  };
  attribution: { name: string; url: string; requirements: string };
}
