/**
 * Phase 8 Automated Test Suite: Recipe Detail, Scaling & Ingredient Checklist Logic
 * Validates requirements from AGENTS.md Section 11 & Phase 8
 */

import assert from 'node:assert';
import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Mirroring the scaling logic from app/src/lib/scaling.ts for Node testing
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

function formatQuantityNumber(val: number): string {
  if (Number.isInteger(val)) return val.toString();
  const rounded = Math.round(val * 100) / 100;
  return rounded.toString();
}

function scaleIngredientQuantity(
  baseQuantity: number | undefined,
  baseServings: number,
  targetServings: number,
  unit?: string,
  note?: string
) {
  if (typeof baseQuantity !== 'number' || baseQuantity <= 0 || isNaN(baseQuantity)) {
    return {
      formattedQuantity: note || unit || '',
      unit,
      isScaled: false,
    };
  }

  const normalizedUnit = (unit || '').toLowerCase().trim();

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

function getSelectAllIds(ingredients: { id: string }[]): string[] {
  return ingredients.map((ing) => ing.id);
}

function getOnlyWhatINeedIds(ingredients: { id: string }[], alreadyHaveIds: string[]): string[] {
  const haveSet = new Set(alreadyHaveIds);
  return ingredients.filter((ing) => !haveSet.has(ing.id)).map((ing) => ing.id);
}

let testsPassed = 0;
let testsFailed = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`✅ PASS: ${desc}`);
          testsPassed++;
        })
        .catch((err) => {
          console.error(`❌ FAIL: ${desc}\n  ${err.message}`);
          testsFailed++;
        });
    } else {
      console.log(`✅ PASS: ${desc}`);
      testsPassed++;
    }
  } catch (err: any) {
    console.error(`❌ FAIL: ${desc}\n  ${err.message}`);
    testsFailed++;
  }
}

async function runPhase8Tests() {
  console.log('========================================');
  console.log('🧪 Starting Phase 8 Test Suite: Recipe Detail & Checklist Logic');
  console.log('========================================\n');

  // --- 1. Quantity Scaling Precision ---
  console.log('--- 1. Testing Servings Scaling Precision ---');
  it('Doubles quantities when servings scale 4 -> 8', () => {
    const res = scaleIngredientQuantity(200, 4, 8, 'g');
    assert.strictEqual(res.quantity, 400);
    assert.strictEqual(res.unit, 'g');
    assert.strictEqual(res.isScaled, true);
  });

  it('Halves quantities when servings scale 4 -> 2', () => {
    const res = scaleIngredientQuantity(500, 4, 2, 'g');
    assert.strictEqual(res.quantity, 250);
    assert.strictEqual(res.unit, 'g');
    assert.strictEqual(res.isScaled, true);
  });

  it('Maintains exact quantity when servings are unchanged (4 -> 4)', () => {
    const res = scaleIngredientQuantity(150, 4, 4, 'g');
    assert.strictEqual(res.quantity, 150);
    assert.strictEqual(res.isScaled, false);
  });

  it('Rounds fractional numbers to at most 2 decimal places', () => {
    // 1 tbsp for 3 servings -> scaled to 4 = 1.33333...
    const res = scaleIngredientQuantity(1, 3, 4, 'tbsp');
    assert.strictEqual(res.quantity, 1.33);
    assert.strictEqual(res.formattedQuantity, '1.33 tbsp');
  });

  // --- 2. Smart Unit Conversions ---
  console.log('\n--- 2. Testing Metric Unit Conversions ---');
  it('Converts grams to kilograms when scaled >= 1000g', () => {
    const res = scaleIngredientQuantity(600, 4, 8, 'g'); // 1200g
    assert.strictEqual(res.quantity, 1.2);
    assert.strictEqual(res.unit, 'kg');
    assert.strictEqual(res.formattedQuantity, '1.2 kg');
  });

  it('Converts kilograms to grams when scaled < 1kg', () => {
    const res = scaleIngredientQuantity(0.8, 4, 2, 'kg'); // 0.4kg
    assert.strictEqual(res.quantity, 400);
    assert.strictEqual(res.unit, 'g');
    assert.strictEqual(res.formattedQuantity, '400 g');
  });

  it('Converts milliliters to liters when scaled >= 1000ml', () => {
    const res = scaleIngredientQuantity(750, 2, 4, 'ml'); // 1500ml
    assert.strictEqual(res.quantity, 1.5);
    assert.strictEqual(res.unit, 'L');
    assert.strictEqual(res.formattedQuantity, '1.5 L');
  });

  it('Converts liters to milliliters when scaled < 1L', () => {
    const res = scaleIngredientQuantity(0.5, 4, 2, 'l'); // 0.25L
    assert.strictEqual(res.quantity, 250);
    assert.strictEqual(res.unit, 'ml');
    assert.strictEqual(res.formattedQuantity, '250 ml');
  });

  // --- 3. Non-Scalable Units & Fallbacks ---
  console.log('\n--- 3. Testing Non-Scalable Units & Fallbacks ---');
  it('Does not scale items with "to taste" unit', () => {
    const res = scaleIngredientQuantity(1, 4, 12, 'to taste');
    assert.strictEqual(res.quantity, 1);
    assert.strictEqual(res.isScaled, false);
    assert.strictEqual(res.formattedQuantity, '1 to taste');
  });

  it('Does not scale items with "pinch" unit', () => {
    const res = scaleIngredientQuantity(2, 4, 8, 'pinch');
    assert.strictEqual(res.quantity, 2);
    assert.strictEqual(res.isScaled, false);
  });

  it('Handles undefined or non-numeric quantity safely', () => {
    const res = scaleIngredientQuantity(undefined, 4, 8, undefined, 'Garnish with fresh coriander');
    assert.strictEqual(res.isScaled, false);
    assert.strictEqual(res.formattedQuantity, 'Garnish with fresh coriander');
  });

  // --- 4. Ingredient Selection & Filter Logic ---
  console.log('\n--- 4. Testing Checklist Selection Helpers ---');
  const sampleIngredients = [
    { id: 'ing_1', name: 'Paneer' },
    { id: 'ing_2', name: 'Tomato' },
    { id: 'ing_3', name: 'Butter' },
    { id: 'ing_4', name: 'Kasuri Methi' },
    { id: 'ing_5', name: 'Ginger' },
  ];

  it('getSelectAllIds returns all ingredient IDs', () => {
    const all = getSelectAllIds(sampleIngredients);
    assert.deepStrictEqual(all, ['ing_1', 'ing_2', 'ing_3', 'ing_4', 'ing_5']);
  });

  it('getOnlyWhatINeedIds filters out items already owned in kitchen', () => {
    const alreadyHave = ['ing_2', 'ing_5']; // Tomato and Ginger in kitchen
    const needed = getOnlyWhatINeedIds(sampleIngredients, alreadyHave);
    assert.deepStrictEqual(needed, ['ing_1', 'ing_3', 'ing_4']);
  });

  it('Rapid selection simulation toggles IDs idempotently', () => {
    let selected: string[] = [];
    const toggle = (id: string) => {
      selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    };

    toggle('ing_1');
    assert.deepStrictEqual(selected, ['ing_1']);
    toggle('ing_2');
    assert.deepStrictEqual(selected, ['ing_1', 'ing_2']);
    toggle('ing_1');
    assert.deepStrictEqual(selected, ['ing_2']);
  });

  // --- 5. Step Progression & Live Detail Endpoint ---
  console.log('\n--- 5. Testing Live Detail Endpoint & Schema ---');
  await it('GET /recipes/themealdb:52772 returns canonical recipe with valid ingredients and steps', async () => {
    const res = await axios.get(`${BASE_URL}/recipes/themealdb:52772`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.title);
    assert.ok(Array.isArray(res.data.data.ingredients));
    assert.ok(res.data.data.ingredients.length > 0);
    assert.ok(Array.isArray(res.data.data.steps));
    assert.ok(res.data.data.steps.length > 0);
  });

  await it('GET /recipes/ai:1792388540532_7oaqd returns stored AI recipe from MongoDB', async () => {
    const res = await axios.get(`${BASE_URL}/recipes/ai:1792388540532_7oaqd`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.isAiGenerated, true);
    assert.strictEqual(res.data.data.source, 'ai');
    assert.ok(res.data.data.ingredients.length > 0);
  });

  await it('GET /recipes/:id/related returns non-empty array for AI recipe', async () => {
    const res = await axios.get(`${BASE_URL}/recipes/ai:1792388540532_7oaqd/related`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length > 0);
  });

  console.log('\n========================================');
  console.log(`📊 Phase 8 Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
