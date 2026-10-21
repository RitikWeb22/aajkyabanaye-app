import { TheMealDBProvider } from '../src/services/recipe-providers/themealdb.js';
import { recipeRegistry } from '../src/services/recipe-providers/registry.js';
import { recipeSchema } from '../src/types/recipe.js';
import { DEV_TEST_FALLBACK_RECIPES } from './fixtures/fallbackRecipes.js';

async function runPhase4Verification() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 4 Recipe Data Layer Verification');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
    }
  }

  // 1. Verify Fallback Test Fixtures are isolated and valid
  console.log('\n--- 1. Testing Fallback Dev/Test Fixtures ---');
  assert(DEV_TEST_FALLBACK_RECIPES.length >= 2, 'Fallback dev recipes fixture contains test items');
  for (const recipe of DEV_TEST_FALLBACK_RECIPES) {
    const parseResult = recipeSchema.safeParse(recipe);
    assert(
      parseResult.success,
      `Fallback recipe "${recipe.title}" adheres to canonical Zod schema`,
      parseResult.success ? undefined : JSON.stringify(parseResult.error.format())
    );
    assert(
      recipe.attribution?.providerName === 'Dev Seed Fallback',
      `Fallback recipe "${recipe.title}" is explicitly attributed as Dev Seed Fallback and not live data`
    );
    assert(
      recipe.source === 'custom' || recipe.id.startsWith('test:'),
      `Fallback recipe "${recipe.title}" has distinct test id/source`
    );
  }

  // 2. Verify Live TheMealDB Search
  console.log('\n--- 2. Testing Live TheMealDB Provider Search ---');
  const mealDb = new TheMealDBProvider();
  
  console.log('Fetching live recipes for query: "curry"...');
  const searchResult = await mealDb.search({ query: 'curry', limit: 5 });
  assert(searchResult.items.length > 0, `Live search returned ${searchResult.items.length} recipes for "curry"`);
  
  if (searchResult.items.length > 0) {
    const first = searchResult.items[0];
    const parseFirst = recipeSchema.safeParse(first);
    assert(parseFirst.success, `Normalized recipe "${first.title}" passes Zod validation`);
    assert(first.source === 'themealdb', 'Source is correctly set to "themealdb"');
    assert(first.id.startsWith('themealdb:'), `Composite ID format is "themealdb:${first.externalId}"`);
    assert(Boolean(first.attribution?.providerName), 'Attribution providerName is present');
    assert(first.ingredients.length > 0, `Ingredients extracted (${first.ingredients.length} items)`);
    assert(first.steps.length > 0, `Preparation steps extracted (${first.steps.length} steps)`);
    assert(first.isAiGenerated === false, 'isAiGenerated is false for provider recipe');
  }

  // 3. Verify getById lookup & caching
  console.log('\n--- 3. Testing getById Recipe Detail Lookup ---');
  // 52865 is Chicken Karaage or Matar Paneer or similar in TheMealDB
  const testId = '52865';
  console.log(`Fetching recipe details for external ID "${testId}"...`);
  const detail = await mealDb.getById(testId);
  assert(detail !== null, `Lookup by ID ${testId} succeeded`);
  if (detail) {
    assert(detail.externalId === testId, `externalId matches requested ID ${testId}`);
    assert(detail.servings > 0, `Servings is defined (${detail.servings})`);
    assert(typeof detail.dietary.vegetarian === 'boolean', `Vegetarian flag is boolean (${detail.dietary.vegetarian})`);
  }

  // 4. Verify Graceful Error Handling on Invalid ID
  console.log('\n--- 4. Testing Error Gracefulness on Invalid ID ---');
  const invalidResult = await mealDb.getById('invalid_id_99999999');
  assert(invalidResult === null, 'Invalid recipe ID returns null gracefully without throwing uncaught exceptions');

  // 5. Verify Registry Multi-criteria Search & Deduplication
  console.log('\n--- 5. Testing RecipeProviderRegistry Search & Deduplication ---');
  const registryResult = await recipeRegistry.search({ query: 'chicken', limit: 6 });
  assert(registryResult.items.length > 0, `Registry search returned ${registryResult.items.length} items`);
  
  // Test deduplication logic
  const duplicates = [
    registryResult.items[0],
    { ...registryResult.items[0], id: 'duplicate:test' },
  ];
  const deduped = recipeRegistry.deduplicateRecipes(duplicates);
  assert(deduped.length === 1, 'Registry deduplication correctly removes duplicates with identical normalized title');

  // 6. Verify Related Recipes
  if (detail) {
    console.log('\n--- 6. Testing Related Recipes Recommendation ---');
    const related = await recipeRegistry.getRelated(detail, 4);
    assert(Array.isArray(related), 'getRelated returns an array');
    assert(!related.some((r) => r.id === detail.id), 'getRelated excludes the current recipe from recommendations');
  }

  console.log('\n====================================================');
  console.log(`🏁 Phase 4 Verification Complete: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase4Verification().catch((err) => {
  console.error('Fatal error during Phase 4 verification:', err);
  process.exit(1);
});
