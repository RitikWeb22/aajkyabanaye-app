export interface ParsedSearchIntent {
  originalQuery: string;
  cleanedQuery: string;
  dishName?: string;
  ingredients: string[];
  cuisine?: string;
  diet?: 'veg' | 'non-veg' | 'vegan';
  maxTime?: number;
  exclusions: string[];
  category?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  isIngredientSearch: boolean;
}

const COMMON_INGREDIENTS = [
  'potato', 'potatoes', 'aloo',
  'onion', 'onions', 'pyaz',
  'tomato', 'tomatoes', 'tamatar',
  'paneer', 'cottage cheese',
  'garlic', 'lehsun',
  'ginger', 'adrak',
  'chilli', 'chili', 'chillies', 'mirch',
  'coriander', 'cilantro', 'dhaniya',
  'chicken', 'murg',
  'egg', 'eggs', 'anda',
  'rice', 'chawal', 'basmati',
  'dal', 'lentil', 'lentils',
  'capsicum', 'bell pepper', 'shimla mirch',
  'curd', 'yogurt', 'dahi',
  'spinach', 'palak',
  'mushroom', 'mushrooms',
  'cauliflower', 'gobi',
  'peas', 'matar',
  'cream', 'malai',
  'cheese',
  'flour', 'atta', 'maida',
  'bread',
  'milk',
  'butter',
  'mutton', 'lamb',
  'fish', 'prawn', 'prawns',
];

const CUISINE_KEYWORDS: Record<string, string> = {
  indian: 'Indian',
  desi: 'Indian',
  punjabi: 'Indian',
  'south indian': 'Indian',
  mughlai: 'Indian',
  italian: 'Italian',
  chinese: 'Chinese',
  mexican: 'Mexican',
  thai: 'Thai',
  american: 'American',
  british: 'British',
};

const CATEGORY_KEYWORDS: Record<string, 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'> = {
  breakfast: 'breakfast',
  nashta: 'breakfast',
  brunch: 'breakfast',
  lunch: 'lunch',
  dopahar: 'lunch',
  dinner: 'dinner',
  raat: 'dinner',
  snack: 'snack',
  snacks: 'snack',
  chaat: 'snack',
  starter: 'snack',
  starters: 'snack',
  dessert: 'dessert',
  desserts: 'dessert',
  sweet: 'dessert',
  sweets: 'dessert',
  mithai: 'dessert',
};

/**
 * Rules-based intent parser for culinary queries
 */
export function parseSearchIntent(rawQuery: string): ParsedSearchIntent {
  const query = rawQuery.trim();
  const lower = query.toLowerCase();

  const intent: ParsedSearchIntent = {
    originalQuery: query,
    cleanedQuery: query,
    ingredients: [],
    exclusions: [],
    isIngredientSearch: false,
  };

  // 1. Time extraction (e.g. "under 20 minutes", "in 15 mins", "< 30 mins", "under 30 mins")
  const timeMatch = lower.match(/(?:under|within|in|less than|<)\s*(\d+)\s*(?:min|mins|minute|minutes)/i)
    || lower.match(/(\d+)\s*(?:min|mins|minute|minutes)/i);
  if (timeMatch && timeMatch[1]) {
    const mins = parseInt(timeMatch[1], 10);
    if (!isNaN(mins) && mins > 0) {
      intent.maxTime = mins;
    }
  }

  // 2. Exclusions extraction (e.g. "without cream", "no onion", "without an oven", "eggless")
  const withoutMatches = lower.matchAll(/(?:without|no|free from|excluding)\s+([a-z\s]+?)(?:$|\band\b|,|\bunder\b|\bfor\b)/gi);
  for (const m of withoutMatches) {
    if (m[1]) {
      const excludedTerm = m[1].trim().replace(/^(an?|the)\s+/, '');
      if (excludedTerm && excludedTerm.length > 2) {
        intent.exclusions.push(excludedTerm);
      }
    }
  }

  if (lower.includes('eggless')) {
    intent.exclusions.push('egg');
  }
  if (lower.includes('dairy free') || lower.includes('dairy-free')) {
    intent.exclusions.push('milk', 'cream', 'paneer', 'cheese', 'curd');
  }

  // 3. Diet extraction
  if (lower.includes('pure veg') || lower.includes('vegetarian') || (lower.includes('veg') && !lower.includes('non-veg') && !lower.includes('non veg'))) {
    intent.diet = 'veg';
  } else if (lower.includes('non veg') || lower.includes('non-veg') || lower.includes('chicken') || lower.includes('mutton') || lower.includes('meat') || lower.includes('fish')) {
    intent.diet = 'non-veg';
  } else if (lower.includes('vegan')) {
    intent.diet = 'vegan';
  }

  // 4. Meal type / Category extraction
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
      intent.category = cat;
      break;
    }
  }

  // 5. Cuisine extraction
  for (const [kw, cuis] of Object.entries(CUISINE_KEYWORDS)) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
      intent.cuisine = cuis;
      break;
    }
  }

  // 6. Ingredient search detection (e.g. "What can I cook with potatoes and onions?", "recipe with paneer and tomato")
  const isIngredientQuery =
    /what can i (make|cook)|using|with|ingredients/i.test(lower) ||
    lower.startsWith('potato') ||
    lower.startsWith('paneer') ||
    lower.startsWith('egg');

  // Extract ingredients mentioned
  for (const ing of COMMON_INGREDIENTS) {
    // Ensure it's not in exclusions
    const isExcluded = intent.exclusions.some((ex) => ex.includes(ing) || ing.includes(ex));
    if (!isExcluded) {
      const ingRegex = new RegExp(`\\b${ing}\\b`, 'i');
      if (ingRegex.test(lower)) {
        // Normalize plural to singular if common
        let normalizedIng = ing;
        if (ing === 'potatoes') normalizedIng = 'potato';
        if (ing === 'onions') normalizedIng = 'onion';
        if (ing === 'tomatoes') normalizedIng = 'tomato';
        if (ing === 'eggs') normalizedIng = 'egg';
        if (ing === 'mushrooms') normalizedIng = 'mushroom';

        if (!intent.ingredients.includes(normalizedIng)) {
          intent.ingredients.push(normalizedIng);
        }
      }
    }
  }

  if (isIngredientQuery || intent.ingredients.length > 0) {
    intent.isIngredientSearch = true;
  }

  // 7. Clean query: strip conversational filler and instructions
  let cleaned = lower
    .replace(/what can i (cook|make)\s*(with)?/gi, '')
    .replace(/(?:under|within|in|less than|<)\s*\d+\s*(?:min|mins|minute|minutes)/gi, '')
    .replace(/(?:without|no|free from|excluding)\s+[a-z\s]+/gi, '')
    .replace(/\b(recipe|recipes|dish|dishes|something|for|quick|easy|fast|high-protein|protein)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If cleaned is empty, fall back to ingredients or cuisine or original
  if (!cleaned && intent.ingredients.length > 0) {
    cleaned = intent.ingredients.join(' ');
  } else if (!cleaned && intent.category) {
    cleaned = intent.category;
  } else if (!cleaned) {
    cleaned = query;
  }

  intent.cleanedQuery = cleaned;
  intent.dishName = cleaned;

  return intent;
}
