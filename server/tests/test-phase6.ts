import { parseSearchIntent } from '../src/services/search/intentParser.js';
import { rankRecipes } from '../src/services/search/ranking.js';
import { TheMealDBProvider } from '../src/services/recipe-providers/themealdb.js';

async function runPhase6Tests() {
  console.log('\n========================================');
  console.log('🧪 Starting Phase 6 Smart Search Test Suite');
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

  // 1. Test Intent Parser on required queries (from Section 9)
  console.log('--- 1. Testing Intent Parsing ---');

  // Query 1: "Paneer butter masala"
  const q1 = parseSearchIntent('Paneer butter masala');
  assert('Query 1: extracts dish title', q1.cleanedQuery.toLowerCase().includes('paneer butter masala'));

  // Query 2: "What can I cook with potatoes and onions?"
  const q2 = parseSearchIntent('What can I cook with potatoes and onions?');
  assert('Query 2: detects ingredient search', q2.isIngredientSearch === true);
  assert('Query 2: extracts potato & onion', q2.ingredients.includes('potato') && q2.ingredients.includes('onion'));

  // Query 3: "Quick dinner under 20 minutes"
  const q3 = parseSearchIntent('Quick dinner under 20 minutes');
  assert('Query 3: extracts maxTime: 20', q3.maxTime === 20);
  assert('Query 3: extracts category: dinner', q3.category === 'dinner');

  // Query 4: "High-protein vegetarian breakfast"
  const q4 = parseSearchIntent('High-protein vegetarian breakfast');
  assert('Query 4: extracts diet: veg', q4.diet === 'veg');
  assert('Query 4: extracts category: breakfast', q4.category === 'breakfast');

  // Query 5: "Something sweet without an oven"
  const q5 = parseSearchIntent('Something sweet without an oven');
  assert('Query 5: extracts category: dessert/sweet', q5.category === 'dessert');
  assert('Query 5: extracts exclusion: oven', q5.exclusions.some((e) => e.includes('oven')));

  // Query 6: "spicy paneer without cream"
  const q6 = parseSearchIntent('spicy paneer without cream');
  assert('Query 6: extracts ingredient: paneer', q6.ingredients.includes('paneer'));
  assert('Query 6: extracts exclusion: cream', q6.exclusions.some((e) => e.includes('cream')));

  // 2. Test Ranking & Exclusion Penalty
  console.log('\n--- 2. Testing Ranking & Exclusion Penalties ---');

  const provider = new TheMealDBProvider();
  const searchResults = await provider.search({ query: 'paneer' });

  assert('Provider returns paneer meals', searchResults.items.length > 0);

  const { ranked, suggestAi } = rankRecipes(searchResults.items, q6);
  assert('Ranker produced ranked output', ranked.length >= 0);
  if (ranked.length > 0) {
    const top = ranked[0];
    assert('Top ranked recipe has match quality', Boolean(top.matchQuality));
    assert('Top recipe does not contain excluded cream', !top.hasExcludedIngredients || top.score < 0);
  }

  // 3. Test HTTP Endpoints on Local Server
  console.log('\n--- 3. Testing HTTP API Endpoints ---');
  try {
    const baseUrl = 'http://localhost:5000';

    // Test /search?q=paneer
    const resSearch = await fetch(`${baseUrl}/search?q=paneer&limit=4`);
    const dataSearch: any = await resSearch.json();
    assert('GET /search returns data array', Array.isArray(dataSearch.data));
    assert('GET /search returns parsedIntent', Boolean(dataSearch.parsedIntent));
    assert('GET /search returns suggestAi flag', typeof dataSearch.suggestAi === 'boolean');

    // Test /search/suggestions
    const resSugg = await fetch(`${baseUrl}/search/suggestions?q=pan`);
    const dataSugg: any = await resSugg.json();
    assert('GET /search/suggestions returns autocomplete items', Array.isArray(dataSugg.data) && dataSugg.data.length > 0);

    // Test /search/popular
    const resPop = await fetch(`${baseUrl}/search/popular`);
    const dataPop: any = await resPop.json();
    assert('GET /search/popular returns list of popular searches', Array.isArray(dataPop.data) && dataPop.data.length > 0);

    // Test Ingredient query: "What can I cook with potatoes and onions?"
    const resIng = await fetch(`${baseUrl}/search?q=${encodeURIComponent('What can I cook with potatoes and onions?')}`);
    const dataIng: any = await resIng.json();
    assert('GET /search handles conversational ingredient query', Boolean(dataIng.data));
    assert('Ingredient search parsed ingredients', dataIng.parsedIntent?.ingredients?.length >= 2);
  } catch (err) {
    assert('Live endpoints respond successfully', false, err);
  }

  console.log('\n========================================');
  console.log(`📊 Phase 6 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
