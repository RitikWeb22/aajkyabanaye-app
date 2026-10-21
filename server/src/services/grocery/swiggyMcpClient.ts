import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { encryptToken, decryptToken } from '../../lib/crypto.js';
import { SwiggyUserToken, SwiggyOAuthSession, ISwiggyUserToken } from '../../models/SwiggySession.js';
import { isDbConnected } from '../../lib/db.js';

export class SwiggyAuthError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = 'AUTH_REQUIRED', statusCode = 401) {
    super(message);
    this.name = 'SwiggyAuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class SwiggyAddressError extends Error {
  code: string;

  constructor(message: string, code = 'ADDRESS_REQUIRED') {
    super(message);
    this.name = 'SwiggyAddressError';
    this.code = code;
  }
}

export const SwiggyTokenResponseSchema = z.object({
  access_token: z.string().min(10, 'Invalid or empty access_token in Swiggy response'),
  refresh_token: z.string().optional(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number().int().positive().default(3600),
  scope: z.string().optional(),
});

export type SwiggyMcpTokenResponse = z.infer<typeof SwiggyTokenResponseSchema>;

export interface SwiggyProductItem {
  id: string;
  name: string;
  brand?: string;
  price?: number;
  mrp?: number;
  weight?: string;
  inStock?: boolean;
  imageUrl?: string;
  spinId?: string;
  skuId?: string;
  isMock?: boolean;
}

export interface UpdateCartItemInput {
  spinId?: string;
  productId?: string;
  name?: string;
  quantity: number;
}

export interface CartUpdateResult {
  success: boolean;
  cartId?: string;
  cartTotalAmount?: string | number;
  items?: any[];
  billBreakdown?: any;
  selectedAddressDetails?: any;
  superData?: any;
  error?: string;
}

/**
 * Robust Server-Sent Events (SSE) parser for MCP responses.
 * Correctly handles event boundaries, multi-line data chunks, and JSON-RPC stream errors.
 */
export function parseMcpSseResponse(rawText: string, expectedRequestId?: string): any {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  // Normalize all newline formats (\r\n and \r to \n)
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // SSE blocks are separated by double newlines
  const blocks = normalized.split(/\n\n+/);

  let finalResult: any = null;
  let finalError: any = null;

  for (const block of blocks) {
    if (!block.trim()) continue;

    const lines = block.split('\n');
    let eventType = 'message';
    const dataChunks: string[] = [];

    for (const line of lines) {
      if (line.startsWith(':')) {
        // SSE comment or keep-alive heartbeat, ignore
        continue;
      }
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataChunks.push(line.slice(5).trimStart());
      }
    }

    if (dataChunks.length === 0) continue;
    const fullData = dataChunks.join('\n');

    try {
      const parsed = JSON.parse(fullData);

      if (eventType === 'error' || parsed.error) {
        finalError = parsed.error || new Error(fullData);
        continue;
      }

      // Verify JSON-RPC Request ID matching if provided
      if (expectedRequestId && parsed.id && parsed.id !== expectedRequestId) {
        console.warn(`JSON-RPC SSE ID mismatch: expected ${expectedRequestId}, received ${parsed.id}`);
      }

      if (parsed.result !== undefined) {
        finalResult = parsed.result;
      }
    } catch {
      if (eventType === 'error') {
        finalError = new Error(fullData);
      }
    }
  }

  if (finalError) {
    const errorMsg = finalError.message || (typeof finalError === 'string' ? finalError : JSON.stringify(finalError));
    throw new Error(`Swiggy MCP tool error: ${errorMsg}`);
  }

  if (finalResult !== null) {
    return finalResult;
  }

  return { text: rawText };
}

/**
 * Official Swiggy Builders Club MCP Client
 * 
 * Documentation: https://mcp.swiggy.com/builders/docs/reference/instamart/
 * Endpoint: POST https://mcp.swiggy.com/im
 * Protocol: Model Context Protocol (MCP) JSON-RPC 2.0
 * Authentication: OAuth 2.1 with PKCE (S256)
 */
export class SwiggyMcpClient {
  private mcpEndpoint = 'https://mcp.swiggy.com/im';
  private authBaseUrl = 'https://mcp.swiggy.com/auth';
  private clientId = 'swiggy-mcp';

  // In-memory fallback map for test environments where MongoDB might not be running
  private memSessions = new Map<string, { codeVerifier: string; redirectUri: string; clerkUserId?: string; createdAt: number }>();

  /**
   * Store user-scoped Swiggy token encrypted at rest in MongoDB
   */
  async setUserToken(clerkUserId: string, tokenData: SwiggyMcpTokenResponse): Promise<void> {
    if (!clerkUserId || !tokenData.access_token) {
      throw new Error('User ID and valid access token are required to store Swiggy token');
    }

    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined;
    const expiresInSec = tokenData.expires_in && tokenData.expires_in > 0 ? tokenData.expires_in : 3600;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);

    if (isDbConnected()) {
      try {
        await SwiggyUserToken.findOneAndUpdate(
          { clerkUserId },
          {
            clerkUserId,
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenType: tokenData.token_type || 'Bearer',
            expiresAt,
            scope: tokenData.scope || 'mcp:tools mcp:resources',
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (err) {
        console.error(`Failed to securely save Swiggy token for user ${clerkUserId}:`, err);
        throw new Error('Failed to securely store Swiggy authentication credentials');
      }
    }
  }

  /**
   * Refresh expired or near-expiry token using refresh_token grant
   */
  async refreshAccessToken(clerkUserId: string): Promise<string> {
    if (!isDbConnected()) {
      throw new SwiggyAuthError('Database not connected. Cannot perform token refresh.', 'DB_DISCONNECTED', 500);
    }

    const record = await SwiggyUserToken.findOne({ clerkUserId });
    if (!record || !record.encryptedRefreshToken) {
      throw new SwiggyAuthError('No refresh token available. Re-authentication required.', 'REAUTH_REQUIRED', 401);
    }

    const rawRefreshToken = decryptToken(record.encryptedRefreshToken);
    if (!rawRefreshToken) {
      throw new SwiggyAuthError('Failed to decrypt refresh token. Re-authentication required.', 'REAUTH_REQUIRED', 401);
    }

    const response = await fetch(`${this.authBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: rawRefreshToken,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      // Revoke invalid session
      await this.clearUserToken(clerkUserId);
      throw new SwiggyAuthError(`Swiggy token refresh failed (${response.status}): ${errText}`, 'REAUTH_REQUIRED', 401);
    }

    const json = await response.json();
    const parseRes = SwiggyTokenResponseSchema.safeParse(json);
    if (!parseRes.success) {
      throw new Error(`Invalid token response from Swiggy during refresh: ${parseRes.error.message}`);
    }

    const freshData = parseRes.data;
    // If no new refresh token returned, retain existing one
    if (!freshData.refresh_token) {
      freshData.refresh_token = rawRefreshToken;
    }

    await this.setUserToken(clerkUserId, freshData);
    return freshData.access_token;
  }

  /**
   * Retrieve and decrypt user-scoped Swiggy MCP access token.
   * Automatically refreshes near-expiry tokens if a refresh token is present.
   */
  async getUserToken(clerkUserId?: string): Promise<string | null> {
    if (clerkUserId && isDbConnected()) {
      try {
        const record = await SwiggyUserToken.findOne({ clerkUserId });
        if (record) {
          const now = Date.now();
          const expiresAtMs = record.expiresAt.getTime();

          // If expired or within 60 seconds of expiring, attempt auto-refresh
          if (now + 60000 >= expiresAtMs) {
            try {
              console.log(`Swiggy token for user ${clerkUserId} is near expiry. Refreshing token...`);
              return await this.refreshAccessToken(clerkUserId);
            } catch (refreshErr) {
              console.warn(`Token refresh failed for user ${clerkUserId}:`, refreshErr);
              return null;
            }
          }

          const decrypted = decryptToken(record.encryptedAccessToken);
          if (decrypted && decrypted.trim().length > 10) {
            return decrypted;
          }
        }
      } catch (err) {
        console.warn(`Error retrieving Swiggy token for user ${clerkUserId}:`, err);
      }
    }

    // Development environment fallback
    if (process.env.NODE_ENV !== 'production' && process.env.SWIGGY_MCP_ACCESS_TOKEN) {
      const devToken = process.env.SWIGGY_MCP_ACCESS_TOKEN.trim();
      if (devToken.length > 10) {
        return devToken;
      }
    }

    return null;
  }

  /**
   * Revoke/delete user-scoped Swiggy token
   */
  async clearUserToken(clerkUserId: string): Promise<void> {
    if (isDbConnected()) {
      try {
        await SwiggyUserToken.deleteOne({ clerkUserId });
      } catch (err) {
        console.warn(`Could not clear Swiggy token for user ${clerkUserId}:`, err);
      }
    }
  }

  /**
   * Check if a specific user has an active, non-expired Swiggy session
   */
  async isUserConnected(clerkUserId?: string): Promise<boolean> {
    const token = await this.getUserToken(clerkUserId);
    return Boolean(token && token.trim().length > 10);
  }

  /**
   * Global connection check for system readiness or dev fallback
   */
  isConnected(): boolean {
    if (process.env.NODE_ENV !== 'production' && process.env.SWIGGY_MCP_ACCESS_TOKEN) {
      return process.env.SWIGGY_MCP_ACCESS_TOKEN.trim().length > 10;
    }
    return false;
  }

  /**
   * Generates PKCE S256 Verifier and Challenge, and returns the Swiggy OAuth 2.1 URL.
   * Persists OAuth transaction state in MongoDB with a 10-minute TTL to survive server restarts.
   */
  async createAuthUrl(
    redirectUri: string,
    clerkUserId?: string,
    state?: string
  ): Promise<{ authUrl: string; state: string; codeVerifier: string }> {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const csrfState = state || crypto.randomBytes(16).toString('hex');

    // Persist in MongoDB with TTL if connected
    if (isDbConnected()) {
      try {
        await SwiggyOAuthSession.create({
          state: csrfState,
          clerkUserId,
          codeVerifier,
          redirectUri,
          createdAt: new Date(),
        });
      } catch (err) {
        console.warn('Could not persist OAuth session to MongoDB, using memory fallback:', err);
      }
    }

    // Keep memory fallback
    this.memSessions.set(csrfState, {
      codeVerifier,
      redirectUri,
      clerkUserId,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: csrfState,
      scope: 'mcp:tools mcp:resources',
    });

    return {
      authUrl: `${this.authBaseUrl}/authorize?${params.toString()}`,
      state: csrfState,
      codeVerifier,
    };
  }

  /**
   * Retrieve and immediately consume session for stored session state (one-time use).
   */
  async consumeSessionForState(state: string): Promise<{ codeVerifier: string; redirectUri: string; clerkUserId?: string } | null> {
    if (!state) return null;

    // 1. Try MongoDB if connected
    if (isDbConnected()) {
      try {
        const dbSession = await SwiggyOAuthSession.findOneAndDelete({ state });
        if (dbSession) {
          this.memSessions.delete(state);
          return {
            codeVerifier: dbSession.codeVerifier,
            redirectUri: dbSession.redirectUri,
            clerkUserId: dbSession.clerkUserId,
          };
        }
      } catch (err) {
        console.warn('Error reading SwiggyOAuthSession from DB:', err);
      }
    }

    // 2. Try in-memory fallback
    const mem = this.memSessions.get(state);
    if (mem) {
      this.memSessions.delete(state);
      // Validate 10-minute expiry
      if (Date.now() - mem.createdAt > 10 * 60 * 1000) {
        return null;
      }
      return {
        codeVerifier: mem.codeVerifier,
        redirectUri: mem.redirectUri,
        clerkUserId: mem.clerkUserId,
      };
    }

    return null;
  }

  /**
   * Exchanges authorization code for Swiggy MCP Access Token with strict schema validation
   */
  async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clerkUserId?: string
  ): Promise<SwiggyMcpTokenResponse> {
    const response = await fetch(`${this.authBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Swiggy token exchange failed (${response.status}): ${errText}`);
    }

    const rawJson = await response.json();
    const validated = SwiggyTokenResponseSchema.safeParse(rawJson);
    if (!validated.success) {
      throw new Error(`Swiggy token exchange returned invalid payload: ${validated.error.message}`);
    }

    const data = validated.data;
    if (data.access_token && clerkUserId) {
      await this.setUserToken(clerkUserId, data);
    }
    return data;
  }

  /**
   * Executes a tool call over Swiggy MCP JSON-RPC 2.0 protocol.
   * Generates a collision-free UUID request ID and validates the response ID.
   */
  async callTool<T = any>(toolName: string, args: Record<string, any> = {}, userToken?: string): Promise<T> {
    const token = userToken || (process.env.NODE_ENV !== 'production' ? process.env.SWIGGY_MCP_ACCESS_TOKEN : null);
    if (!token) {
      throw new SwiggyAuthError('Swiggy MCP authentication required. Please connect your Swiggy account first.', 'AUTH_REQUIRED', 401);
    }

    // Collision-free unique request ID
    const requestId = crypto.randomUUID();

    const payload = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await fetch(this.mcpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401 || errText.includes('invalid_token')) {
        throw new SwiggyAuthError(`Swiggy session expired or invalid (${response.status}): ${errText}`, 'SESSION_EXPIRED', 401);
      }
      throw new Error(`Swiggy MCP call error (${response.status}): ${errText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      const rawText = await response.text();
      return parseMcpSseResponse(rawText, requestId);
    }

    const json = (await response.json()) as any;
    if (json?.id && json.id !== requestId) {
      console.warn(`JSON-RPC ID mismatch for ${toolName}: expected ${requestId}, got ${json.id}`);
    }

    if (json?.error) {
      throw new Error(`Swiggy MCP tool error: ${json.error.message || JSON.stringify(json.error)}`);
    }

    return json.result;
  }

  /**
   * Swiggy Instamart Tool: get_addresses
   * Accurately distinguishes between authentication errors, network failures, and genuine empty address lists.
   */
  async getAddresses(userToken?: string): Promise<any[]> {
    let result: any;
    try {
      result = await this.callTool('get_addresses', {}, userToken);
    } catch (err: any) {
      // Re-throw authentication failures instead of masking as empty address list
      if (err instanceof SwiggyAuthError || err?.message?.includes('authentication required') || err?.message?.includes('401') || err?.message?.includes('invalid_token')) {
        throw new SwiggyAuthError(err.message, 'AUTH_REQUIRED', 401);
      }
      // Re-throw server/network errors
      throw err;
    }

    const sc = result?.structuredContent;
    if (Array.isArray(sc?.addresses) && sc.addresses.length > 0) {
      return sc.addresses;
    }
    if (Array.isArray(result?.addresses) && result.addresses.length > 0) {
      return result.addresses;
    }
    return [];
  }

  /**
   * Helper to retrieve active default address or first saved address.
   * Can assert required address presence before darkstore tools run.
   */
  async getDefaultAddress(
    userToken?: string,
    required: boolean = false
  ): Promise<{ id: string; addressLine?: string; tag?: string; area?: string; name?: string } | null> {
    const addresses = await this.getAddresses(userToken);
    if (!addresses || addresses.length === 0) {
      if (required) {
        throw new SwiggyAddressError(
          'No saved delivery address found in your Swiggy account. A delivery address is required for Instamart grocery ordering.',
          'NO_SAVED_ADDRESS'
        );
      }
      return null;
    }

    const defaultAddr = addresses.find((a: any) => a.isDefault || a.default) || addresses[0];
    const id = defaultAddr?.id;
    if (!id) {
      if (required) {
        throw new SwiggyAddressError('Selected delivery address has no valid address ID.', 'INVALID_ADDRESS');
      }
      return null;
    }

    return {
      id,
      addressLine: defaultAddr.addressLine || defaultAddr.address,
      tag: defaultAddr.addressTag || defaultAddr.category || 'Home',
      area: defaultAddr.area || 'Nearby',
      name: defaultAddr.name || 'Customer',
    };
  }

  /**
   * Explicitly validate that a delivery address is available and return the verified address ID.
   * Throws SwiggyAddressError if address is missing.
   */
  async assertValidAddress(addressId?: string, userToken?: string): Promise<string> {
    if (addressId && typeof addressId === 'string' && addressId.trim().length > 0) {
      return addressId.trim();
    }
    const defaultAddr = await this.getDefaultAddress(userToken, true);
    if (!defaultAddr?.id) {
      throw new SwiggyAddressError(
        'Delivery address is required for Instamart operations. Please select or add an address in your Swiggy account.',
        'ADDRESS_REQUIRED'
      );
    }
    return defaultAddr.id;
  }

  /**
   * Swiggy Instamart Tool: search_products
   * In production: Returns only actual darkstore inventory. On API error or no match, returns empty list.
   * Mock inventory is strictly limited to development-only mode with explicit ENABLE_MOCK_GROCERY flag.
   */
  async searchProducts(query: string, addressId?: string, userToken?: string): Promise<SwiggyProductItem[]> {
    const cleanTerm = query.trim();
    if (!cleanTerm) return [];

    try {
      let targetAddressId = addressId;
      if (!targetAddressId && userToken) {
        try {
          const defaultAddr = await this.getDefaultAddress(userToken, false);
          targetAddressId = defaultAddr?.id;
        } catch (addrErr) {
          if (addrErr instanceof SwiggyAuthError) throw addrErr;
        }
      }

      const result = await this.callTool('search_products', { query: cleanTerm, addressId: targetAddressId }, userToken);
      
      // 1. Swiggy MCP returns structuredContent.products
      const structuredProducts = result?.structuredContent?.products;
      if (Array.isArray(structuredProducts) && structuredProducts.length > 0) {
        return structuredProducts.map((p: any) => {
          const firstVariant = Array.isArray(p.variations) && p.variations.length > 0 ? p.variations[0] : null;
          return {
            id: firstVariant?.spinId || firstVariant?.skuId || p.productId || p.id,
            name: p.displayName || firstVariant?.displayName || cleanTerm,
            brand: firstVariant?.brandName || p.brand || 'Swiggy Instamart',
            price: firstVariant?.price?.offerPrice || firstVariant?.price?.mrp || p.price,
            mrp: firstVariant?.price?.mrp || firstVariant?.price?.offerPrice,
            weight: firstVariant?.quantityDescription || p.weight || '1 Pack',
            inStock: firstVariant?.isInStockAndAvailable ?? p.inStock ?? true,
            imageUrl: firstVariant?.imageUrl || p.imageUrl,
            spinId: firstVariant?.spinId || p.productId,
            skuId: firstVariant?.skuId,
          };
        });
      }

      // 2. Fallback to result.products if present
      if (Array.isArray(result?.products) && result.products.length > 0) {
        return result.products.map((p: any) => {
          const firstVariant = Array.isArray(p.variations) && p.variations.length > 0 ? p.variations[0] : null;
          return {
            id: firstVariant?.spinId || firstVariant?.skuId || p.productId || p.id,
            name: p.displayName || p.name || cleanTerm,
            brand: p.brand || firstVariant?.brandName || 'Swiggy Instamart',
            price: firstVariant?.price?.offerPrice || p.price,
            mrp: firstVariant?.price?.mrp || p.mrp,
            weight: firstVariant?.quantityDescription || p.weight || '1 Pack',
            inStock: firstVariant?.isInStockAndAvailable ?? p.inStock ?? true,
            imageUrl: firstVariant?.imageUrl || p.imageUrl,
            spinId: firstVariant?.spinId || p.spinId || p.id,
            skuId: firstVariant?.skuId || p.skuId,
          };
        });
      }

      // Live search returned no items
      return [];
    } catch (err) {
      if (err instanceof SwiggyAuthError) {
        throw err;
      }
      console.warn(`Swiggy MCP search notice for "${cleanTerm}":`, err);

      // In production, never fabricate inventory
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_MOCK_GROCERY !== 'true') {
        return [];
      }
    }

    // STRICT DEV-ONLY SIMULATION (Only active when ENABLE_MOCK_GROCERY='true' in non-production)
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_GROCERY === 'true') {
      return [
        {
          id: `mock_sku_${Buffer.from(cleanTerm).toString('hex').slice(0, 8)}`,
          name: `${cleanTerm} (Simulated Preview)`,
          brand: 'Simulated Darkstore (Dev Only)',
          price: 45,
          mrp: 55,
          weight: '1 Pack',
          inStock: true,
          spinId: `mock_spin_${Buffer.from(cleanTerm).toString('hex').slice(0, 8)}`,
          skuId: `mock_sku_${Buffer.from(cleanTerm).toString('hex').slice(0, 8)}`,
          isMock: true,
        },
      ];
    }

    return [];
  }

  /**
   * Swiggy Instamart Tool: update_cart
   * Official schema expects: selectedAddressId and items: Array<{ spinId: string; quantity: number }>
   * 
   * Strict validation:
   * - selectedAddressId must be validated explicitly before proceeding
   * - Every item must have a valid spinId (no fake 'spin_default' allowed)
   * - Quantity must be a positive integer >= 1
   * - On failure, returns success: false with clear error message (never claims fake success)
   */
  async updateCart(
    items: UpdateCartItemInput[],
    addressId?: string,
    userToken?: string
  ): Promise<CartUpdateResult> {
    // 1. Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        error: 'Cannot update cart: At least one item is required.',
      };
    }

    // 2. Explicit address validation
    let targetAddressId: string;
    try {
      targetAddressId = await this.assertValidAddress(addressId, userToken);
    } catch (addrErr: any) {
      return {
        success: false,
        error: addrErr?.message || 'A valid delivery address is required before updating the Swiggy Instamart cart.',
      };
    }

    // 3. Strict item validation - reject fake IDs and non-positive quantities
    const formatted: Array<{ spinId: string; quantity: number }> = [];

    for (const it of items) {
      const candidateSpinId = (it.spinId || it.productId || '').trim();
      const itemName = it.name || candidateSpinId || 'item';

      if (!candidateSpinId || candidateSpinId === 'spin_default' || candidateSpinId === 'item' || candidateSpinId.length < 3) {
        return {
          success: false,
          error: `Invalid product mapping for "${itemName}": Item does not have a verified Swiggy product identifier (spinId). Please select a verified product.`,
        };
      }

      const qty = it.quantity;
      if (!Number.isInteger(qty) || qty < 1) {
        return {
          success: false,
          error: `Invalid quantity (${qty}) for item "${itemName}". Quantity must be a positive integer greater than or equal to 1.`,
        };
      }

      formatted.push({
        spinId: candidateSpinId,
        quantity: qty,
      });
    }

    // 4. Execute official MCP tool call
    try {
      const res = await this.callTool('update_cart', { items: formatted, selectedAddressId: targetAddressId }, userToken);
      const sc = res?.structuredContent;
      if (sc) {
        return {
          success: true,
          cartId: sc.cartId,
          cartTotalAmount: sc.cartTotalAmount,
          items: sc.items || [],
          billBreakdown: sc.billBreakdown,
          selectedAddressDetails: sc.selectedAddressDetails,
          superData: sc.superData,
        };
      }

      if (res?.error) {
        return {
          success: false,
          error: res.error.message || 'Swiggy MCP rejected cart update.',
        };
      }

      return {
        success: true,
        ...res,
      };
    } catch (err: any) {
      console.warn('Swiggy MCP update_cart API error:', err);
      // P0 FIX: Never claim fake success. Return success: false with actual error.
      return {
        success: false,
        error: err?.message || 'Failed to update Swiggy cart with official MCP API.',
      };
    }
  }

  /**
   * Swiggy Instamart Tool: get_cart
   */
  async getCart(userToken?: string): Promise<any> {
    return this.callTool('get_cart', {}, userToken);
  }

  /**
   * Swiggy Instamart Tool: clear_cart
   */
  async clearCart(userToken?: string): Promise<any> {
    return this.callTool('clear_cart', {}, userToken);
  }
}

export const swiggyMcp = new SwiggyMcpClient();
