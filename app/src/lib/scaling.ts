/**
 * Recipe Quantity Scaling & Unit Conversion Utility
 * Strictly adheres to AGENTS.md Section 11 & Phase 8
 */

export interface ScaledIngredientResult {
  formattedQuantity: string;
  quantity?: number;
  unit?: string;
  isScaled: boolean;
}

const NON_SCALABLE_UNITS = new Set([
  'to taste',
  'to_taste',
  'as required',
  'as needed',
  'pinch',
  'pinches',
  'dash',
  'handful',
  'few',
]);

/**
 * Cleanly format numbers for display (e.g. 1.5, 0.25, 2)
 */
export function formatQuantityNumber(val: number): string {
  if (Number.isInteger(val)) {
    return val.toString();
  }
  // Round to 2 decimal places max, avoiding floating point weirdness (e.g. 0.3333333 -> 0.33)
  const rounded = Math.round(val * 100) / 100;
  return rounded.toString();
}

/**
 * Scale an ingredient quantity based on baseServings vs targetServings.
 * Automatically performs sensible unit conversions (g <-> kg, ml <-> l).
 */
export function scaleIngredientQuantity(
  baseQuantity: number | undefined,
  baseServings: number,
  targetServings: number,
  unit?: string,
  note?: string
): ScaledIngredientResult {
  // If no numeric quantity, check if it's a non-scalable item
  if (typeof baseQuantity !== 'number' || baseQuantity <= 0 || isNaN(baseQuantity)) {
    const fallbackText = note || unit || '';
    return {
      formattedQuantity: fallbackText,
      unit,
      isScaled: false,
    };
  }

  const normalizedUnit = (unit || '').toLowerCase().trim();

  // If marked with non-scalable unit, do not scale
  if (NON_SCALABLE_UNITS.has(normalizedUnit)) {
    return {
      formattedQuantity: `${formatQuantityNumber(baseQuantity)} ${unit || ''}`.trim(),
      quantity: baseQuantity,
      unit,
      isScaled: false,
    };
  }

  const safeBaseServings = Math.max(1, baseServings || 4);
  const safeTargetServings = Math.max(1, targetServings);
  const scaleRatio = safeTargetServings / safeBaseServings;

  let scaledQuantity = baseQuantity * scaleRatio;
  let finalUnit = unit || '';

  // Smart metric unit conversions
  if (normalizedUnit === 'g' || normalizedUnit === 'grams' || normalizedUnit === 'gm') {
    if (scaledQuantity >= 1000) {
      scaledQuantity = scaledQuantity / 1000;
      finalUnit = 'kg';
    }
  } else if (normalizedUnit === 'kg' && scaledQuantity < 1) {
    scaledQuantity = scaledQuantity * 1000;
    finalUnit = 'g';
  } else if (normalizedUnit === 'ml' || normalizedUnit === 'milliliters') {
    if (scaledQuantity >= 1000) {
      scaledQuantity = scaledQuantity / 1000;
      finalUnit = 'L';
    }
  } else if ((normalizedUnit === 'l' || normalizedUnit === 'liter' || normalizedUnit === 'litre') && scaledQuantity < 1) {
    scaledQuantity = scaledQuantity * 1000;
    finalUnit = 'ml';
  }

  const formattedNum = formatQuantityNumber(scaledQuantity);
  const formattedQuantity = finalUnit ? `${formattedNum} ${finalUnit}` : formattedNum;

  return {
    formattedQuantity,
    quantity: Math.round(scaledQuantity * 100) / 100,
    unit: finalUnit,
    isScaled: scaleRatio !== 1,
  };
}

/**
 * Filter helpers for ingredient selection:
 */

export interface IngredientRef {
  id: string;
  name: string;
}

/**
 * Returns all ingredient IDs
 */
export function getSelectAllIds(ingredients: IngredientRef[]): string[] {
  return ingredients.map((ing) => ing.id);
}

/**
 * Returns IDs of all ingredients EXCEPT those the user already has in kitchen
 */
export function getOnlyWhatINeedIds(
  ingredients: IngredientRef[],
  alreadyHaveIds: string[]
): string[] {
  const haveSet = new Set(alreadyHaveIds);
  return ingredients.filter((ing) => !haveSet.has(ing.id)).map((ing) => ing.id);
}
