import {
  swiggyMcp,
  SwiggyAuthError,
  SwiggyAddressError,
  parseMcpSseResponse,
  SwiggyTokenResponseSchema,
} from '../src/services/grocery/swiggyMcpClient.js';
import { encryptToken, decryptToken } from '../src/lib/crypto.js';

async function runAuditFixesVerification() {
  console.log('🔍 Running Audit Fixes Verification (Part 1 + Part 2)...\n');
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

  // ----------------------------------------------------
  // Test 1: P0 — Token Storage Encryption (AES-256-GCM)
  // ----------------------------------------------------
  try {
    const rawToken = 'swiggy_secret_oauth_access_token_xyz123456789';
    const encrypted = encryptToken(rawToken);
    assert(encrypted !== rawToken, 'Token is encrypted and not stored in plaintext');
    assert(encrypted.split(':').length === 3, 'Encrypted package contains IV, AuthTag, and Ciphertext');

    const decrypted = decryptToken(encrypted);
    assert(decrypted === rawToken, 'Decrypted token matches original plaintext exactly');

    // Tampered ciphertext fails authentication
    const tampered = encrypted.slice(0, -4) + 'abcd';
    const decryptedTampered = decryptToken(tampered);
    assert(decryptedTampered === null, 'Tampered ciphertext with bad auth tag is rejected safely');
  } catch (err: any) {
    assert(false, 'Token Encryption / Decryption', err.message);
  }

  // ----------------------------------------------------
  // Test 2: P1 — OAuth PKCE Session Handling & Expiry
  // ----------------------------------------------------
  try {
    const redirectUri = 'https://aajkyabanaye-app.onrender.com/shopping/swiggy/callback';
    const { authUrl, state, codeVerifier } = await swiggyMcp.createAuthUrl(redirectUri, 'user_clerk_123');

    assert(Boolean(authUrl && authUrl.includes('code_challenge')), 'Generated OAuth URL with PKCE S256 code challenge');
    assert(Boolean(state && codeVerifier), 'State and codeVerifier are generated');

    // Retrieve and consume session
    const consumed = await swiggyMcp.consumeSessionForState(state);
    assert(consumed !== null, 'Session state consumed successfully');
    assert(consumed?.codeVerifier === codeVerifier, 'Consumed codeVerifier matches original');
    assert(consumed?.clerkUserId === 'user_clerk_123', 'OAuth session is bound to Clerk user ID');

    // Replay attack prevention: Second consumption must fail
    const replayAttempt = await swiggyMcp.consumeSessionForState(state);
    assert(replayAttempt === null, 'Replay attempt returns null (one-time use enforced)');
  } catch (err: any) {
    assert(false, 'OAuth PKCE Session Handling', err.message);
  }

  // ----------------------------------------------------
  // Test 3: P1 — Incorrect Product Mapping & Validation in updateCart()
  // ----------------------------------------------------
  try {
    // 3A: Empty items array
    const emptyResult = await swiggyMcp.updateCart([], 'addr_123');
    assert(emptyResult.success === false, 'updateCart with empty items returns success: false');

    // 3B: Item without valid spinId (no fake spin_default injection!)
    const invalidIdResult = await swiggyMcp.updateCart(
      [{ spinId: '', productId: '', name: 'Unmatched Item', quantity: 1 }],
      'addr_123'
    );
    assert(invalidIdResult.success === false, 'updateCart rejects items without valid spinId');
    assert(
      Boolean(invalidIdResult.error && invalidIdResult.error.includes('verified Swiggy product identifier')),
      'Error message clearly explains missing spinId requirement'
    );

    // 3C: Item with 'spin_default' rejected
    const spinDefaultResult = await swiggyMcp.updateCart(
      [{ spinId: 'spin_default', name: 'Placeholder Item', quantity: 1 }],
      'addr_123'
    );
    assert(spinDefaultResult.success === false, 'updateCart rejects fake spin_default ID');

    // 3D: Invalid non-positive quantity rejected
    const invalidQtyResult = await swiggyMcp.updateCart(
      [{ spinId: 'spin_valid_12345', name: 'Tomatoes', quantity: 0 }],
      'addr_123'
    );
    assert(invalidQtyResult.success === false, 'updateCart rejects quantity <= 0');

    // 3E: Missing delivery address rejected
    const missingAddrResult = await swiggyMcp.updateCart(
      [{ spinId: 'spin_valid_12345', name: 'Tomatoes', quantity: 2 }],
      ''
    );
    assert(missingAddrResult.success === false, 'updateCart rejects missing delivery address');
  } catch (err: any) {
    assert(false, 'updateCart Validation & Product Mapping', err.message);
  }

  // ----------------------------------------------------
  // Test 4: P0 — Fake Success on Failed Cart Update
  // ----------------------------------------------------
  try {
    const failedUpdate = await swiggyMcp.updateCart(
      [{ spinId: 'spin_987654321', quantity: 2 }],
      'addr_test_456',
      'invalid_swiggy_token_to_trigger_api_failure'
    );
    assert(failedUpdate.success === false, 'Failed API call returns success: false (never claims fake success)');
    assert(Boolean(failedUpdate.error), 'Failed API call provides detailed error message');
  } catch (err: any) {
    assert(false, 'P0 Fake Success Fix', err.message);
  }

  // ----------------------------------------------------
  // Test 5: P0 — Fake Products & Prices in searchProducts()
  // ----------------------------------------------------
  try {
    delete process.env.ENABLE_MOCK_GROCERY;
    let authError = false;
    let searchResult: any[] = [];
    try {
      searchResult = await swiggyMcp.searchProducts('UnknownExoticItemThatDoesNotExist12345');
    } catch (e: any) {
      if (e instanceof SwiggyAuthError) {
        authError = true;
      }
    }
    assert(
      authError || searchResult.length === 0,
      'When disconnected or item not found, production does not fabricate ₹45/₹55 fake products'
    );
  } catch (err: any) {
    assert(false, 'P0 Fake Products Fix', err.message);
  }

  // ----------------------------------------------------
  // Test 6: Part 2 — getAddresses() Auth Failure vs Empty List
  // ----------------------------------------------------
  try {
    let authErrorCaught = false;
    try {
      // Calling without token must throw SwiggyAuthError, not return []
      await swiggyMcp.getAddresses(undefined);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError && err.statusCode === 401) {
        authErrorCaught = true;
      }
    }
    assert(authErrorCaught, 'getAddresses() throws SwiggyAuthError on unauthenticated call instead of returning empty array []');
  } catch (err: any) {
    assert(false, 'getAddresses Error Handling', err.message);
  }

  // ----------------------------------------------------
  // Test 7: Part 2 — getDefaultAddress() & assertValidAddress()
  // ----------------------------------------------------
  try {
    let addressErrorCaught = false;
    try {
      // Asserting valid address when none provided throws SwiggyAddressError or SwiggyAuthError
      await swiggyMcp.assertValidAddress(undefined, undefined);
    } catch (err: any) {
      if (err instanceof SwiggyAddressError || err instanceof SwiggyAuthError) {
        addressErrorCaught = true;
      }
    }
    assert(addressErrorCaught, 'assertValidAddress() strictly asserts address presence before downstream actions proceed');

    // Valid address passes immediately
    const validPassed = await swiggyMcp.assertValidAddress('addr_explicit_valid_123');
    assert(validPassed === 'addr_explicit_valid_123', 'assertValidAddress() returns verified address ID when provided');
  } catch (err: any) {
    assert(false, 'getDefaultAddress & assertValidAddress', err.message);
  }

  // ----------------------------------------------------
  // Test 8: Part 2 — Robust SSE Parser (parseMcpSseResponse)
  // ----------------------------------------------------
  try {
    // 8A: Multi-line chunk joined with event boundary
    const sseMultiLine = [
      'event: message',
      'id: 1',
      'data: {"jsonrpc":"2.0","id":"req-123",',
      'data: "result":{"structuredContent":{"products":[{"id":"p1","name":"Tomato"}]}}}',
      '',
      '',
    ].join('\r\n');

    const parsedResult = parseMcpSseResponse(sseMultiLine, 'req-123');
    assert(Boolean(parsedResult?.structuredContent?.products), 'SSE parser correctly joins multi-line data chunks');
    assert(parsedResult?.structuredContent?.products[0]?.name === 'Tomato', 'Extracted product data matches payload');

    // 8B: Event with error block
    const sseError = [
      'event: error',
      'data: {"code": -32603, "message": "Darkstore connection timeout"}',
      '',
      '',
    ].join('\n');

    let errorCaught = false;
    try {
      parseMcpSseResponse(sseError, 'req-123');
    } catch (err: any) {
      errorCaught = err.message.includes('Darkstore connection timeout');
    }
    assert(errorCaught, 'SSE parser detects event: error and throws descriptive MCP tool error');
  } catch (err: any) {
    assert(false, 'SSE Parser Handling', err.message);
  }

  // ----------------------------------------------------
  // Test 9: Part 2 — Token Response Schema Validation (exchangeCode & refresh)
  // ----------------------------------------------------
  try {
    // Valid token payload passes Zod validation
    const validPayload = {
      access_token: 'valid_access_token_long_enough_12345',
      refresh_token: 'valid_refresh_token_67890',
      token_type: 'Bearer',
      expires_in: 7200,
      scope: 'mcp:tools mcp:resources',
    };
    const validParsed = SwiggyTokenResponseSchema.safeParse(validPayload);
    assert(validParsed.success === true, 'SwiggyTokenResponseSchema accepts valid token responses');

    // Missing access_token is rejected
    const invalidPayload = {
      expires_in: 7200,
    };
    const invalidParsed = SwiggyTokenResponseSchema.safeParse(invalidPayload);
    assert(invalidParsed.success === false, 'SwiggyTokenResponseSchema rejects payloads missing access_token');

    // Negative expires_in is rejected
    const negativeExpiry = {
      access_token: 'valid_token_xyz_123456789',
      expires_in: -100,
    };
    const negParsed = SwiggyTokenResponseSchema.safeParse(negativeExpiry);
    assert(negParsed.success === false, 'SwiggyTokenResponseSchema rejects negative expiry duration');
  } catch (err: any) {
    assert(false, 'Token Schema Validation', err.message);
  }

  console.log(`\n========================================`);
  console.log(`Audit Fixes Verification: ${passed}/${total} Tests Passed`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runAuditFixesVerification().catch((err) => {
  console.error('Fatal error in audit verification:', err);
  process.exit(1);
});
