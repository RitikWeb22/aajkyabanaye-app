import { Recipe } from '../../types/recipe.js';
import { ParsedSearchIntent } from './intentParser.js';

export interface RankedRecipe {
  recipe: Recipe;
  score: number;
  matchQuality: 'high' | 'medium' | 'low';
  matchedIngredients: string[];
  hasExcludedIngredients: boolean;
}

/**
 * Levenshtein distance implementation for typo tolerance
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

/**
 * Normalized string similarity (0 to 1) based on Levenshtein distance
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Rank a list of normalized recipes against the parsed user search intent
 */
export function rankRecipes(
  recipes: Recipe[],
  intent: ParsedSearchIntent
): { ranked: RankedRecipe[]; suggestAi: boolean } {
  const rankedItems: RankedRecipe[] = [];

  const cleanedQueryLower = intent.cleanedQuery.toLowerCase();
  const queryTokens = cleanedQueryLower.split(/\s+/).filter((t) => t.length > 2);

  for (const recipe of recipes) {
    let score = 0;
    const titleLower = recipe.title.toLowerCase();
    const recipeIngredientsText = recipe.ingredients.map((i) => i.name.toLowerCase()).join(' ');
    const instructionsText = recipe.steps.map((s) => s.text.toLowerCase()).join(' ');

    // 1. Check exclusions (e.g. "without cream", "without oven")
    let hasExcluded = false;
    for (const exclusion of intent.exclusions) {
      const exLower = exclusion.toLowerCase().trim();
      if (
        titleLower.includes(exLower) ||
        recipeIngredientsText.includes(exLower) ||
        (exLower === 'oven' && instructionsText.includes('bake') || instructionsText.includes('oven'))
      ) {
        hasExcluded = true;
        break;
      }
    }

    if (hasExcluded) {
      // Exclude or severely penalize
      score -= 100;
    }

    // 2. Exact Title Match
    if (titleLower === cleanedQueryLower) {
      score += 60;
    } else if (titleLower.includes(cleanedQueryLower)) {
      score += 35;
    } else {
      // Fuzzy Title Match / Typo tolerance
      const titleSim = stringSimilarity(cleanedQueryLower, titleLower);
      if (titleSim > 0.65) {
        score += Math.round(titleSim * 30);
      }
    }

    // 3. Query Token Overlap in Title
    let tokenMatches = 0;
    for (const token of queryTokens) {
      if (titleLower.includes(token)) {
        tokenMatches++;
        score += 12;
      }
    }

    // 4. Ingredient Overlap
    const matchedIngredients: string[] = [];
    if (intent.ingredients.length > 0) {
      for (const ing of intent.ingredients) {
        const ingFound = recipe.ingredients.some(
          (recipeIng) =>
            recipeIng.name.toLowerCase().includes(ing) ||
            stringSimilarity(recipeIng.name.toLowerCase(), ing) > 0.8
        );
        if (ingFound) {
          matchedIngredients.push(ing);
          score += 18; // Strong boost per matched ingredient
        }
      }
    }

    // 5. Cuisine Match
    if (intent.cuisine && recipe.cuisine) {
      if (recipe.cuisine.toLowerCase() === intent.cuisine.toLowerCase()) {
        score += 15;
      }
    }

    // 6. Category / Meal Type Match
    if (intent.category && recipe.category) {
      if (recipe.category.toLowerCase() === intent.category.toLowerCase()) {
        score += 15;
      }
    }

    // 7. Diet Match
    if (intent.diet) {
      if (intent.diet === 'veg' && recipe.dietary.vegetarian) {
        score += 12;
      } else if (intent.diet === 'non-veg' && !recipe.dietary.vegetarian) {
        score += 12;
      } else if (intent.diet === 'vegan' && recipe.dietary.vegan) {
        score += 15;
      }
    }

    // 8. Max Time Constraint
    if (intent.maxTime) {
      const totalTime = (recipe.cookTimeMins || 15) + (recipe.prepTimeMins || 5);
      if (totalTime <= intent.maxTime) {
        score += 15;
      } else if (totalTime <= intent.maxTime + 10) {
        score += 5;
      } else {
        score -= 10;
      }
    }

    // Calculate matchQuality tier
    let matchQuality: 'high' | 'medium' | 'low' = 'low';
    if (score >= 35) {
      matchQuality = 'high';
    } else if (score >= 18) {
      matchQuality = 'medium';
    }

    // Filter out completely excluded items from positive scores
    if (score > 0 || !hasExcluded) {
      rankedItems.push({
        recipe,
        score,
        matchQuality,
        matchedIngredients,
        hasExcludedIngredients: hasExcluded,
      });
    }
  }

  // Sort descending by score
  rankedItems.sort((a, b) => b.score - a.score);

  // Determine whether to suggest AI recipe generation:
  // If top score < 20 or no results found, or all items have low relevance
  const topScore = rankedItems.length > 0 ? rankedItems[0].score : 0;
  const suggestAi = rankedItems.length === 0 || topScore < 20 || (intent.isIngredientSearch && rankedItems.length < 3);

  return {
    ranked: rankedItems,
    suggestAi,
  };
}
