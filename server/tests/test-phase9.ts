import axios from 'axios';
import { groceryRegistry } from '../src/services/grocery/registry.js';
import { inferCategory } from '../src/services/grocery/copyList.js';

const BASE_URL = 'http://localhost:5000';

async function runPhase9Tests() {
  console.log('🚀 Starting Phase 9: Shopping Workflow Verification Tests...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    }
  }

  // Test 1: Provider Registry & Instamart Inactive State
  try {
    const copyList = groceryRegistry.get('copy_list');
    const instamart = groceryRegistry.get('instamart');
    const active = groceryRegistry.getActiveProvider();

    assert(Boolean(copyList && copyList.isAvailable()), 'CopyList provider is registered and available');
    assert(Boolean(instamart && instamart.isAvailable()), 'Instamart provider is registered and active');
    assert(active.id === 'copy_list' || active.id === 'instamart', 'Default active provider is properly configured');
  } catch (err) {
    assert(false, 'Provider Registry Setup', String(err));
  }

  // Test 2: Category Inference
  try {
    const catTomato = inferCategory('Fresh ripe tomatoes');
    const catPaneer = inferCategory('Paneer cubes');
    const catTurmeric = inferCategory('Haldi / Turmeric powder');
    const catBasmati = inferCategory('Basmati Rice');
    const catMystery = inferCategory('Edible gold leaf');

    assert(catTomato === 'Produce', `Infer Produce for tomatoes (got: ${catTomato})`);
    assert(catDairyProteinCheck(catPaneer), `Infer Dairy & Protein for paneer (got: ${catPaneer})`);
    assert(catTurmeric === 'Spices & Seasonings', `Infer Spices for turmeric (got: ${catTurmeric})`);
    assert(catBasmati === 'Pantry & Staples', `Infer Pantry for basmati rice (got: ${catBasmati})`);
    assert(catMystery === 'Other', `Infer Other for mystery ingredient (got: ${catMystery})`);
  } catch (err) {
    assert(false, 'Category Inference Logic', String(err));
  }

  // Test 3: GET /shopping/providers API
  try {
    const res = await axios.get(`${BASE_URL}/shopping/providers`);
    assert(res.status === 200 && res.data.success, 'GET /shopping/providers returns 200 OK');
    const providers = res.data.data;
    assert(Array.isArray(providers) && providers.length >= 2, 'Returns list of at least 2 providers');
    const hasCopy = providers.some((p: any) => p.id === 'copy_list' && p.isAvailable === true);
    const hasInstamart = providers.some((p: any) => p.id === 'instamart' && p.isAvailable === true);
    assert(hasCopy, 'copy_list is reported as available');
    assert(hasInstamart, 'instamart is reported as available');
  } catch (err) {
    assert(false, 'GET /shopping/providers endpoint', String(err));
  }

  // Test 4: POST /shopping/prepare - Happy Path
  try {
    const payload = {
      items: [
        { id: '1', name: 'Paneer', quantity: 250, unit: 'g', groceryTerm: 'Fresh Malai Paneer', category: 'Dairy & Protein' },
        { id: '2', name: 'Tomatoes', quantity: 4, unit: 'pcs', groceryTerm: 'Ripe red tomatoes' },
        { id: '3', name: 'Garam Masala', quantity: 1, unit: 'tsp' },
        { id: '4', name: 'Salt', unit: 'to_taste' },
      ],
      meta: {
        recipeTitle: 'Paneer Butter Masala',
        servings: 4,
      },
    };

    const res = await axios.post(`${BASE_URL}/shopping/prepare`, payload);
    assert(res.status === 200 && res.data.success, 'POST /shopping/prepare returns 200 OK');
    const data = res.data.data;
    assert(data.provider === 'copy_list', 'Provider used is copy_list');
    assert(data.type === 'copied', 'Result type is copied');
    assert(data.itemCount === 4, 'Item count matches selected items');
    assert(data.text.includes('Paneer Butter Masala'), 'Generated text includes recipe title');
    assert(data.text.includes('4 servings'), 'Generated text includes servings count');
    assert(data.text.includes('DAIRY & PROTEIN:'), 'Generated text includes categorized headers');
    assert(data.text.includes('PRODUCE:'), 'Generated text groups produce category');
    assert(data.text.includes('Fresh Malai Paneer (250 g)'), 'Generated text includes customized grocery term and quantity');
  } catch (err) {
    assert(false, 'POST /shopping/prepare happy path', String(err));
  }

  // Test 5: POST /shopping/prepare - Validation of empty items
  try {
    await axios.post(`${BASE_URL}/shopping/prepare`, {
      items: [],
    });
    assert(false, 'Empty items should be rejected with 400');
  } catch (err: any) {
    assert(err.response?.status === 400, 'Empty items payload correctly rejected with 400 Bad Request');
    assert(err.response?.data?.error?.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');
  }

  console.log(`\n========================================`);
  console.log(`Phase 9 Verification Summary: ${passed}/${total} Tests Passed`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

function catDairyProteinCheck(cat: string): boolean {
  return cat === 'Dairy & Protein';
}

runPhase9Tests().catch((err) => {
  console.error('Fatal error running Phase 9 tests:', err);
  process.exit(1);
});
