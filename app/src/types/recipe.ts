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

export interface Ingredient {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
  groceryTerm?: string;
  category?: string;
}

export interface Step {
  order: number;
  text: string;
}

export interface Recipe {
  id: string; // `${source}:${externalId}` or `ai:${id}`
  source: 'themealdb' | 'spoonacular' | 'ai' | 'custom';
  externalId?: string;
  title: string;
  description?: string;
  image?: string;
  cuisine?: string;
  category?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'other';
  dietary: {
    vegetarian: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    tags: string[];
  };
  prepTimeMins?: number;
  cookTimeMins?: number;
  servings: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  ingredients: Ingredient[];
  steps: Step[];
  tips?: string[];
  substitutions?: { ingredient: string; alternatives: string[] }[];
  allergens?: string[];
  rating?: { value: number; count: number };
  attribution?: { providerName: string; url?: string; license?: string };
  isAiGenerated: boolean;
}

export interface RecipeFilterParams {
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

export interface PagedRecipes {
  items: Recipe[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  image?: string;
  action: {
    type: 'category' | 'recipe' | 'search' | 'url';
    value: string;
  };
  buttonText?: string;
  priority?: number;
}

export interface RecentlyViewedItem {
  id: string;
  source: string;
  externalId: string;
  title: string;
  image?: string;
  cuisine?: string;
  isVeg?: boolean;
  cookTimeMins?: number;
  servings?: number;
  difficulty?: string;
  viewedAt: string;
}

