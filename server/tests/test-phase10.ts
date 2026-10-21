import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const TEST_USER_ID = `test_user_phase10_${Date.now()}`;
const authHeaders = {
  'x-test-user-id': TEST_USER_ID,
};

async function runPhase10Tests() {
  console.log('🚀 Starting Phase 10: Personal Features Verification Suite...\n');
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

  // --- 1. Auth Enforcement ---
  try {
    await axios.get(`${BASE_URL}/me/favorites`);
    assert(false, 'Protected endpoint /me/favorites must reject unauthenticated request with 401');
  } catch (err: any) {
    assert(
      err.response?.status === 401,
      'Unauthenticated request to /me/favorites is rejected with 401 Unauthorized'
    );
  }

  // --- 2. Favorites CRUD ---
  const testRecipeId = 'themealdb:52772';
  try {
    // 2.1 Check initially not favorited
    const check1 = await axios.get(`${BASE_URL}/me/favorites/check?recipeId=${testRecipeId}`, {
      headers: authHeaders,
    });
    assert(check1.status === 200 && check1.data.isFavorited === false, 'Initially recipe is not favorited');

    // 2.2 Add favorite
    const addRes = await axios.post(
      `${BASE_URL}/me/favorites`,
      {
        recipeId: testRecipeId,
        snapshot: {
          title: 'Teriyaki Chicken Casserole',
          image: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
          cuisine: 'Japanese',
          isVeg: false,
          cookTimeMins: 45,
          servings: 4,
          difficulty: 'medium',
        },
      },
      { headers: authHeaders }
    );
    assert(addRes.status === 200 && addRes.data.success, 'POST /me/favorites adds recipe');

    // 2.3 Check now favorited
    const check2 = await axios.get(`${BASE_URL}/me/favorites/check?recipeId=${testRecipeId}`, {
      headers: authHeaders,
    });
    assert(check2.data.isFavorited === true, 'GET /me/favorites/check returns isFavorited: true');

    // 2.4 List favorites
    const listRes = await axios.get(`${BASE_URL}/me/favorites`, { headers: authHeaders });
    assert(
      listRes.status === 200 && listRes.data.data.some((f: any) => f.id === testRecipeId),
      'GET /me/favorites includes newly favorited recipe'
    );

    // 2.5 Delete favorite
    const delRes = await axios.delete(`${BASE_URL}/me/favorites/${testRecipeId}`, {
      headers: authHeaders,
    });
    assert(delRes.status === 200 && delRes.data.success, 'DELETE /me/favorites/:id removes recipe');

    // 2.6 Check no longer favorited
    const check3 = await axios.get(`${BASE_URL}/me/favorites/check?recipeId=${testRecipeId}`, {
      headers: authHeaders,
    });
    assert(check3.data.isFavorited === false, 'Recipe is no longer favorited after deletion');
  } catch (err: any) {
    assert(false, 'Favorites CRUD flow', err.response?.data?.error?.message || String(err));
  }

  // --- 3. Grocery Lists CRUD & Item Management ---
  let createdListId = '';
  try {
    // 3.1 Create grocery list
    const createRes = await axios.post(
      `${BASE_URL}/me/grocery-lists`,
      {
        name: 'Weekend Feast Prep',
        items: [
          { name: 'Paneer', quantity: 500, unit: 'g', category: 'Dairy & Protein' },
          { name: 'Tomatoes', quantity: 6, unit: 'pcs' },
        ],
      },
      { headers: authHeaders }
    );
    assert(createRes.status === 201 && createRes.data.success, 'POST /me/grocery-lists creates list');
    createdListId = createRes.data.data.id;
    assert(createRes.data.data.items.length === 2, 'Initial items saved with list');
    assert(createRes.data.data.items[1].category === 'Produce', 'Category automatically inferred for tomatoes');

    // 3.2 List user's grocery lists
    const listsRes = await axios.get(`${BASE_URL}/me/grocery-lists`, { headers: authHeaders });
    assert(
      listsRes.status === 200 && listsRes.data.data.some((l: any) => l.id === createdListId),
      'GET /me/grocery-lists returns created list'
    );

    // 3.3 Add item to list
    const addItemRes = await axios.post(
      `${BASE_URL}/me/grocery-lists/${createdListId}/items`,
      { name: 'Kasoori Methi', quantity: 1, unit: 'box' },
      { headers: authHeaders }
    );
    assert(addItemRes.status === 201 && addItemRes.data.success, 'POST /me/grocery-lists/:id/items adds item');
    const newItemId = addItemRes.data.data.id;
    assert(addItemRes.data.data.category === 'Spices & Seasonings', 'Infers Spices category for Kasoori Methi');

    // 3.4 Toggle purchased status
    const patchItemRes = await axios.patch(
      `${BASE_URL}/me/grocery-lists/${createdListId}/items/${newItemId}`,
      { purchased: true },
      { headers: authHeaders }
    );
    assert(
      patchItemRes.status === 200 && patchItemRes.data.data.purchased === true,
      'PATCH item sets purchased: true'
    );

    // 3.5 Delete item
    const delItemRes = await axios.delete(
      `${BASE_URL}/me/grocery-lists/${createdListId}/items/${newItemId}`,
      { headers: authHeaders }
    );
    assert(delItemRes.status === 200 && delItemRes.data.success, 'DELETE item removes it from list');

    // 3.6 Fetch single list
    const getListRes = await axios.get(`${BASE_URL}/me/grocery-lists/${createdListId}`, {
      headers: authHeaders,
    });
    assert(
      getListRes.status === 200 && getListRes.data.data.items.length === 2,
      'GET /me/grocery-lists/:id returns verified remaining items'
    );
  } catch (err: any) {
    assert(false, 'Grocery Lists CRUD flow', err.response?.data?.error?.message || String(err));
  }

  // --- 4. Meal Planner Flow ---
  const currentWeek = '2026-10-19';
  try {
    // 4.1 Fetch empty week plan
    const getPlanRes = await axios.get(`${BASE_URL}/me/meal-plans?weekStart=${currentWeek}`, {
      headers: authHeaders,
    });
    assert(getPlanRes.status === 200, 'GET /me/meal-plans returns plan object');

    // 4.2 Add breakfast entry
    const entryRes = await axios.post(
      `${BASE_URL}/me/meal-plans/entry`,
      {
        weekStart: currentWeek,
        date: currentWeek,
        slot: 'breakfast',
        recipeId: 'themealdb:52772',
        servings: 4,
        snapshot: {
          title: 'Teriyaki Chicken Casserole',
          image: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
          cuisine: 'Japanese',
          isVeg: false,
          cookTimeMins: 45,
        },
      },
      { headers: authHeaders }
    );
    assert(entryRes.status === 200 && entryRes.data.success, 'POST /me/meal-plans/entry schedules meal slot');

    // 4.3 Meal Suggestions
    const suggestRes = await axios.post(
      `${BASE_URL}/me/meal-plans/suggest`,
      { date: currentWeek, slot: 'dinner' },
      { headers: authHeaders }
    );
    assert(
      suggestRes.status === 200 && Array.isArray(suggestRes.data.data) && suggestRes.data.data.length > 0,
      'POST /me/meal-plans/suggest returns culinary recommendations'
    );

    // 4.4 Generate combined grocery list from planned week
    const genListRes = await axios.post(
      `${BASE_URL}/me/meal-plans/grocery-list`,
      { weekStart: currentWeek, title: `Test Meal Plan Groceries ${Date.now()}` },
      { headers: authHeaders }
    );
    assert(
      genListRes.status === 201 && genListRes.data.success && genListRes.data.data.itemCount > 0,
      `POST /me/meal-plans/grocery-list aggregates recipes into new GroceryList (${genListRes.data.data?.itemCount} items)`
    );

    // 4.5 Clean up grocery list
    if (createdListId) {
      await axios.delete(`${BASE_URL}/me/grocery-lists/${createdListId}`, { headers: authHeaders });
    }
  } catch (err: any) {
    assert(false, 'Meal Planner flow', err.response?.data?.error?.message || String(err));
  }

  console.log(`\n========================================`);
  console.log(`Phase 10 Verification Summary: ${passed}/${total} Tests Passed`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase10Tests().catch((err) => {
  console.error('Fatal error running Phase 10 tests:', err);
  process.exit(1);
});
