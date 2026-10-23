import { connectDB } from '../src/lib/db.js';
import { env } from '../src/config/env.js';
import { aiRecipeGenerator } from '../src/services/ai/generator.js';
import { checkAndIncrementQuota, getQuotaStatus, getTodayDateKey } from '../src/services/ai/quota.js';
import { AiUsageModel } from '../src/models/AiUsage.js';
import { recipeSchema } from '../src/types/recipe.js';

async function runPhase7Tests() {
  console.log('\n========================================');
  console.log('🧪 Starting Phase 7 AI Recipe Generation Test Suite');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`, details || '');
      failed++;
    }
  }
  // Connect to MongoDB
  await connectDB();

  // 1. Test Prompt Construction & Injection Hygiene
  console.log('--- 1. Testing Prompt Construction & Sanitation ---');
  const testInput = {
    prompt: 'Paneer Bhurji with hot paratha',
    ingredients: ['paneer', 'onion', 'tomato'],
    dietary: 'veg' as const,
    cuisine: 'North Indian',
    servings: 2,
    maxTime: 20,
    exclusions: ['cream'],
  };

  const builtPrompt = aiRecipeGenerator.buildPrompt(testInput);
  assert('Prompt includes user request', builtPrompt.includes('Paneer Bhurji with hot paratha'));
  assert('Prompt wraps specifications in <user_specification>', builtPrompt.includes('<user_specification>'));
  assert('Prompt includes ingredients list', builtPrompt.includes('paneer, onion, tomato'));
  assert('Prompt includes exclusions', builtPrompt.includes('cream'));

  // 2. Test Zod Normalization & Auto-repair
  console.log('\n--- 2. Testing Zod Normalization & Auto-Repair ---');
  const sampleRawAiOutput = {
    title: 'Spicy Kadai Paneer',
    description: 'Fresh paneer tossed with bell peppers and freshly ground kadai masala.',
    cuisine: 'Indian',
    category: 'dinner',
    dietary: {
      vegetarian: true,
      vegan: false,
      glutenFree: true,
      tags: ['High-Protein', 'Spicy'],
    },
    prepTimeMins: 10,
    cookTimeMins: 15,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      { name: 'Paneer', quantity: 200, unit: 'g', note: 'cubed' },
      { name: 'Capsicum', quantity: 1, unit: 'pcs', note: 'diced' },
      { name: 'Onion', quantity: 2, unit: 'pcs', note: 'chopped' },
    ],
    steps: [
      { order: 1, text: 'Dry roast coriander and cumin seeds, then coarsely crush.' },
      { order: 2, text: 'Sauté onions and bell peppers in a hot wok.' },
      { order: 3, text: 'Toss in paneer cubes and simmer with freshly ground spices.' },
    ],
    tips: ['Do not overcook paneer to keep it soft.'],
  };

  const normalized = aiRecipeGenerator.normalizeAndValidate(sampleRawAiOutput, testInput);
  assert('Normalized recipe has ai: id prefix', normalized.id.startsWith('ai:'));
  assert('Normalized recipe has isAiGenerated = true', normalized.isAiGenerated === true);
  assert('Normalized recipe has generated ingredient IDs', Boolean(normalized.ingredients[0].id));
  assert('Normalized recipe validates with canonical Zod schema', recipeSchema.safeParse(normalized).success);
  assert('Normalized recipe has attribution disclaimer', Boolean(normalized.attribution?.license));

  // 3. Test Atomic Quota Enforcement in MongoDB
  console.log('\n--- 3. Testing Atomic Quota Enforcement ---');
  const testUserId = `test_user_quota_${Date.now()}`;
  const dateKey = getTodayDateKey();

  // Clean up any test record first
  await AiUsageModel.deleteOne({ clerkUserId: testUserId, dateKey });

  // Check initial quota
  const initialQuota = await getQuotaStatus(testUserId);
  assert('Initial quota used = 0', initialQuota.used === 0);
  assert(`Initial quota remaining = ${env.AI_DAILY_LIMIT_PER_USER}`, initialQuota.remaining === env.AI_DAILY_LIMIT_PER_USER);
  assert('Initial quota allowed = true', initialQuota.allowed === true);

  // Increment up to limit
  const limit = env.AI_DAILY_LIMIT_PER_USER;
  for (let i = 1; i <= limit; i++) {
    const status = await checkAndIncrementQuota(testUserId);
    assert(`Increment #${i}: used = ${i}, allowed = true`, status.allowed && status.used === i);
  }

  // Attempt to exceed limit
  const exceededStatus = await checkAndIncrementQuota(testUserId);
  assert('Exceeding quota is blocked with allowed = false', exceededStatus.allowed === false);
  assert('Remaining is 0 when quota exceeded', exceededStatus.remaining === 0);

  // Clean up test record
  await AiUsageModel.deleteOne({ clerkUserId: testUserId, dateKey });

  // 4. Test Live Endpoints Security
  console.log('\n--- 4. Testing Endpoints & Auth Guards ---');
  try {
    const baseUrl = 'http://localhost:5000';
    // Verify unauthenticated GET /me/ai-recipes returns 401 (requireAuth)
    const resHistoryUnauth = await fetch(`${baseUrl}/me/ai-recipes`);
    assert('GET /me/ai-recipes returns 401 without Bearer token', resHistoryUnauth.status === 401);

    // Verify guest access for /ai/quota returns 200
    const resQuota = await fetch(`${baseUrl}/ai/quota`);
    assert('GET /ai/quota returns 200 with quota info for guest', resQuota.status === 200);
  } catch (err: any) {
    assert('Live endpoints respond successfully', false, err);
  }

  console.log('\n========================================');
  console.log(`📊 Phase 7 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error('Phase 7 Test Runner error:', err);
  process.exit(1);
});
