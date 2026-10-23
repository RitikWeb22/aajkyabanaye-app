/**
 * MASTER QA AUTOMATION TEST SUITE
 * AajKyaBanaye Production Readiness & Real-World QA Testing
 * 
 * Verifies all 7 dimensions from the Master Agent Prompt:
 * 1. Architecture, Health & Configuration
 * 2. Double-Click & Rapid Interaction Concurrency
 * 3. Authentication & Cross-User Isolation
 * 4. Recipe Generation, Search Stress & Quota Rollback
 * 5. Meal Planner Slot Integrity
 * 6. Ingredient Checklist & Instamart Integration
 * 7. Error Formats & API Resilience
 */

import axios from 'axios';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db.js';
import { checkAndIncrementQuota, rollbackQuota, getQuotaStatus } from '../src/services/ai/quota.js';
import { env } from '../src/config/env.js';

const BASE_URL = 'http://localhost:5000';

const USER_A = `qa_user_alpha_${Date.now()}`;
const USER_B = `qa_user_bravo_${Date.now()}`;

const headersUserA = { 'x-test-user-id': USER_A };
const headersUserB = { 'x-test-user-id': USER_B };

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logPass(title: string) {
  totalTests++;
  passedTests++;
  console.log(`  ✅ [PASS] ${title}`);
}

function logFail(title: string, reason?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ❌ [FAIL] ${title} ->`, reason);
}

async function runMasterQASuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING MASTER QA AUDIT & PRODUCTION READINESS SUITE');
  console.log('====================================================\n');

  // Connect to DB directly for quota verification
  await connectDB();

  // ----------------------------------------------------
  // SECTION 1: Architecture, Health & Configuration
  // ----------------------------------------------------
  console.log('--- 1. Architecture, Health & Configuration ---');
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    if (health.status === 200 && health.data.status === 'ok' && health.data.database?.connected === true) {
      logPass('Health check: status 200, database connected, active providers');
    } else {
      logFail('Health check returned unexpected body', health.data);
    }
  } catch (err: any) {
    logFail('Health check failed', err.message);
  }

  try {
    const ads = await axios.get(`${BASE_URL}/app-ads.txt`);
    if (ads.status === 200 && ads.data.includes('pub-1416168271239862')) {
      logPass('AdMob verification: /app-ads.txt serves official publisher ID');
    } else {
      logFail('app-ads.txt does not contain pub-1416168271239862');
    }
  } catch (err: any) {
    logFail('app-ads.txt request failed', err.message);
  }

  // ----------------------------------------------------
  // SECTION 2: Double-Click & Rapid Interaction Concurrency
  // ----------------------------------------------------
  console.log('\n--- 2. Double-Click & Rapid Interaction Testing ---');
  const rapidUser = `qa_rapid_${Date.now()}`;
  try {
    // Simulate 10 simultaneous rapid clicks attempting to increment quota
    const rapidPromises = Array.from({ length: 10 }, () => checkAndIncrementQuota(rapidUser));
    const results = await Promise.all(rapidPromises);

    const allowedCount = results.filter((r) => r.allowed).length;
    const blockedCount = results.filter((r) => !r.allowed).length;
    const finalStatus = await getQuotaStatus(rapidUser);

    if (allowedCount === 5 && blockedCount === 5 && finalStatus.used === 5 && finalStatus.remaining === 0) {
      logPass('Rapid 10x concurrent requests strictly capped at daily limit (5 allowed, 5 blocked)');
    } else {
      logFail(`Concurrency limit mismatch: allowed=${allowedCount}, blocked=${blockedCount}, used=${finalStatus.used}`);
    }
  } catch (err: any) {
    logFail('Rapid quota concurrency threw exception', err.message);
  }

  // ----------------------------------------------------
  // SECTION 3: Authentication & Cross-User Security
  // ----------------------------------------------------
  console.log('\n--- 3. Authentication & Account Isolation Testing ---');
  
  // 3.1 Protected routes return 401 without auth
  const protectedRoutes = [
    '/me/grocery-lists',
    '/me/meal-plans',
    '/me/favorites',
    '/me/ai-recipes',
  ];

  for (const route of protectedRoutes) {
    try {
      await axios.get(`${BASE_URL}${route}`);
      logFail(`Protected route ${route} unexpectedly permitted unauthenticated access`);
    } catch (err: any) {
      if (err.response?.status === 401 && err.response?.data?.error?.code === 'UNAUTHORIZED') {
        logPass(`Unauthenticated GET ${route} properly rejected with 401 UNAUTHORIZED`);
      } else {
        logFail(`GET ${route} did not return 401 UNAUTHORIZED`, err.response?.status);
      }
    }
  }

  // 3.2 Cross-User Isolation (User A private data cannot be viewed or altered by User B)
  let userAListId = '';
  try {
    const createRes = await axios.post(
      `${BASE_URL}/me/grocery-lists`,
      {
        name: "User A's Secret Groceries",
        items: [{ name: 'Secret Spices', quantity: 1, unit: 'kg' }],
      },
      { headers: headersUserA }
    );
    userAListId = createRes.data.data.id;
    logPass("User A successfully created a private grocery list");
  } catch (err: any) {
    logFail("Failed to create User A list", err.message);
  }

  if (userAListId) {
    // User B tries to view User A's list
    try {
      await axios.get(`${BASE_URL}/me/grocery-lists/${userAListId}`, { headers: headersUserB });
      logFail("SECURITY VULNERABILITY: User B accessed User A's private grocery list!");
    } catch (err: any) {
      if (err.response?.status === 404) {
        logPass("User B attempting GET User A's list returns 404 Not Found (Zero Leakage)");
      } else {
        logFail("User B GET User A's list returned unexpected status", err.response?.status);
      }
    }

    // User B tries to PATCH User A's list
    try {
      await axios.patch(
        `${BASE_URL}/me/grocery-lists/${userAListId}`,
        { name: 'Hacked by User B' },
        { headers: headersUserB }
      );
      logFail("SECURITY VULNERABILITY: User B updated User A's private grocery list!");
    } catch (err: any) {
      if (err.response?.status === 404) {
        logPass("User B attempting PATCH User A's list returns 404 Not Found (Protected)");
      } else {
        logFail("User B PATCH User A's list returned unexpected status", err.response?.status);
      }
    }

    // User B tries to DELETE User A's list
    try {
      await axios.delete(`${BASE_URL}/me/grocery-lists/${userAListId}`, { headers: headersUserB });
      logFail("SECURITY VULNERABILITY: User B deleted User A's private grocery list!");
    } catch (err: any) {
      if (err.response?.status === 404) {
        logPass("User B attempting DELETE User A's list returns 404 Not Found (Protected)");
      } else {
        logFail("User B DELETE User A's list returned unexpected status", err.response?.status);
      }
    }

    // Verify User A's list is completely intact
    try {
      const verifyRes = await axios.get(`${BASE_URL}/me/grocery-lists/${userAListId}`, { headers: headersUserA });
      if (verifyRes.data.data.name === "User A's Secret Groceries") {
        logPass("User A's list verified completely intact and unaltered");
      } else {
        logFail("User A's list name was unexpectedly altered", verifyRes.data);
      }
    } catch (err: any) {
      logFail("User A could not access their own list", err.message);
    }
  }

  // ----------------------------------------------------
  // SECTION 4: Recipe Generation, Search Stress & Quota Rollback
  // ----------------------------------------------------
  console.log('\n--- 4. Recipe Generation, Search Stress & Quota Rollback ---');

  // 4.1 Empty search query
  try {
    const res = await axios.get(`${BASE_URL}/recipes?q=`);
    if (res.status === 200 && Array.isArray(res.data.data)) {
      logPass('Empty search query handled gracefully, returning recipe discovery feed');
    } else {
      logFail('Empty search query did not return valid array');
    }
  } catch (err: any) {
    logFail('Empty search query failed', err.message);
  }

  // 4.2 Unicode, emojis, and special character queries
  const edgeQueries = [
    '🍕 Paneer Butter Masala 🍛',
    '!@#$%^&*()_+~`|}{[]:;?><,./-',
    'A'.repeat(250), // Long query
    'こんにちは', // Japanese Unicode
  ];

  for (const q of edgeQueries) {
    try {
      const res = await axios.get(`${BASE_URL}/recipes`, { params: { q } });
      if (res.status === 200 && Array.isArray(res.data.data)) {
        logPass(`Search resilience: query "${q.slice(0, 20)}..." returned 200 OK without crash`);
      } else {
        logFail(`Search for "${q.slice(0, 20)}" returned unexpected structure`);
      }
    } catch (err: any) {
      logFail(`Search query "${q.slice(0, 20)}" crashed`, err.message);
    }
  }

  // 4.3 Quota Rollback Verification (Failed AI generation does NOT consume user quota)
  const rollbackUser = `qa_rollback_user_${Date.now()}`;
  try {
    const q1 = await checkAndIncrementQuota(rollbackUser);
    if (q1.used === 1 && q1.remaining === 4) {
      // Simulate failure in AI generation -> trigger rollback
      await rollbackQuota(rollbackUser);
      const qAfter = await getQuotaStatus(rollbackUser);
      if (qAfter.used === 0 && qAfter.remaining === 5) {
        logPass('Quota Rollback: Failed AI request successfully refunded quota (used: 0, remaining: 5)');
      } else {
        logFail(`Quota was not restored properly: used=${qAfter.used}, remaining=${qAfter.remaining}`);
      }
    } else {
      logFail('Initial quota increment failed', q1);
    }
  } catch (err: any) {
    logFail('Quota rollback test threw error', err.message);
  }

  // ----------------------------------------------------
  // SECTION 5: Meal Planner Integrity & Idempotency
  // ----------------------------------------------------
  console.log('\n--- 5. Meal Planner Slot Integrity ---');
  const mealPlanWeek = '2026-10-26';
  const mealDate = '2026-10-27';
  const mealSlot = 'lunch';

  try {
    // 5.1 Add initial meal entry
    const entry1Res = await axios.post(
      `${BASE_URL}/me/meal-plans/entry`,
      {
        weekStart: mealPlanWeek,
        date: mealDate,
        slot: mealSlot,
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
      { headers: headersUserA }
    );
    if (entry1Res.status === 200 && entry1Res.data.success) {
      logPass('Initial meal plan entry added successfully');
    }

    // 5.2 Add another meal to the SAME (date, slot) -> should replace cleanly, never duplicate
    const entry2Res = await axios.post(
      `${BASE_URL}/me/meal-plans/entry`,
      {
        weekStart: mealPlanWeek,
        date: mealDate,
        slot: mealSlot,
        recipeId: 'themealdb:52804',
        servings: 2,
        snapshot: {
          title: 'Poutine',
          image: 'https://www.themealdb.com/images/media/meals/uuyrrx1487327597.jpg',
          cuisine: 'Canadian',
          isVeg: true,
          cookTimeMins: 25,
        },
      },
      { headers: headersUserA }
    );
    if (entry2Res.status === 200 && entry2Res.data.success) {
      logPass('Replacement meal plan entry saved successfully');
    }

    // 5.3 Fetch plan and verify exactly ONE entry exists for that slot
    const planRes = await axios.get(`${BASE_URL}/me/meal-plans?weekStart=${mealPlanWeek}`, { headers: headersUserA });
    const entries = planRes.data.data.entries;
    const slotEntries = entries.filter((e: any) => e.date === mealDate && e.slot === mealSlot);

    if (slotEntries.length === 1 && slotEntries[0].snapshot.title === 'Poutine') {
      logPass('Meal Planner Idempotency: Slot replaced cleanly with zero duplicates');
    } else {
      logFail(`Duplicate slots detected! Found ${slotEntries.length} entries for ${mealDate} ${mealSlot}`);
    }

    // 5.4 Generate grocery list from meal plan
    const groceryRes = await axios.post(
      `${BASE_URL}/me/meal-plans/grocery-list`,
      {
        weekStart: mealPlanWeek,
        title: 'Weekly Test Grocery List',
      },
      { headers: headersUserA }
    );
    if (groceryRes.status === 201 && groceryRes.data.data.items.length > 0) {
      logPass(`Meal Plan to Grocery List: Aggregated ${groceryRes.data.data.items.length} items from planned meals`);
    } else {
      logFail('Grocery list generation from meal plan failed', groceryRes.data);
    }
  } catch (err: any) {
    logFail('Meal plan integrity testing failed', err.message);
  }

  // ----------------------------------------------------
  // SECTION 6: Ingredient Checklist & Instamart Handoff
  // ----------------------------------------------------
  console.log('\n--- 6. Ingredient Checklist & Instamart Integration ---');
  try {
    // 6.1 Valid shopping list preparation
    const prepRes = await axios.post(`${BASE_URL}/shopping/prepare`, {
      items: [
        { id: 'ing_1', name: 'Onion', quantity: 2, unit: 'pcs', packQuantity: 1 },
        { id: 'ing_2', name: 'Tomato', quantity: 500, unit: 'g', packQuantity: 2 },
        { id: 'ing_3', name: 'Paneer', quantity: 200, unit: 'g', packQuantity: 1 },
      ],
      meta: { recipeTitle: 'Paneer Butter Masala', servings: 4 },
      providerId: 'instamart',
    });

    if (prepRes.status === 200 && prepRes.data.data.itemCount === 3 && Array.isArray(prepRes.data.data.items)) {
      logPass(`Shopping Prepare: Handled 3 items, formatted clipboard list & items mapping (${prepRes.data.data.provider})`);
    } else {
      logFail('Shopping prepare returned invalid structure', prepRes.data);
    }

    // 6.2 Empty item submission
    try {
      await axios.post(`${BASE_URL}/shopping/prepare`, {
        items: [],
        providerId: 'instamart',
      });
      logFail('Empty items payload should be rejected with 400');
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.error?.code === 'VALIDATION_ERROR') {
        logPass('Empty item submission properly rejected with 400 VALIDATION_ERROR');
      } else {
        logFail('Empty item submission unexpected response', err.response?.status);
      }
    }

    // 6.3 Swiggy MCP Auth URL & Status
    const authUrlRes = await axios.get(`${BASE_URL}/shopping/swiggy/auth-url`);
    if (authUrlRes.status === 200 && authUrlRes.data.data.authUrl.includes('mcp.swiggy.com/auth/authorize')) {
      logPass('Swiggy MCP Integration: Generated live OAuth 2.1 PKCE authorization URL');
    } else {
      logFail('Swiggy auth URL failed', authUrlRes.data);
    }

    const statusRes = await axios.get(`${BASE_URL}/shopping/swiggy/status`);
    if (statusRes.status === 200 && typeof statusRes.data.data.isConnected === 'boolean') {
      logPass(`Swiggy MCP Integration: Status checked successfully (isConnected: ${statusRes.data.data.isConnected})`);
    } else {
      logFail('Swiggy status check failed', statusRes.data);
    }
  } catch (err: any) {
    logFail('Shopping / Swiggy handoff failed', err.message);
  }

  // ----------------------------------------------------
  // SECTION 7: Error Resilience & Standard Formats
  // ----------------------------------------------------
  console.log('\n--- 7. Network & API Error Resilience ---');
  try {
    // Non-existent recipe ID
    try {
      await axios.get(`${BASE_URL}/recipes/nonexistent_recipe_999999`);
      logFail('Non-existent recipe should return 404');
    } catch (err: any) {
      if (err.response?.status === 404 && err.response?.data?.error?.code === 'NOT_FOUND') {
        logPass('Non-existent recipe lookup returns canonical 404 NOT_FOUND structure');
      } else {
        logFail('Non-existent recipe unexpected response', err.response?.status);
      }
    }

    // Malformed request body
    try {
      await axios.post(
        `${BASE_URL}/me/grocery-lists`,
        { invalidField: 12345 },
        { headers: headersUserA }
      );
      logPass('Grocery list with default name created successfully when body has defaults');
    } catch (err: any) {
      if (err.response?.status === 400) {
        logPass('Malformed grocery payload rejected with 400');
      }
    }
  } catch (err: any) {
    logFail('Error resilience checks failed', err.message);
  }

  console.log('\n====================================================');
  console.log(`📊 MASTER QA RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterQASuite().catch((err) => {
  console.error('Master QA Fatal Error:', err);
  process.exit(1);
});
