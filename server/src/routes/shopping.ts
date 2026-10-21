import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { groceryRegistry } from '../services/grocery/registry.js';
import { swiggyMcp, SwiggyAuthError, SwiggyAddressError } from '../services/grocery/swiggyMcpClient.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

export const shoppingRouter = Router();

const prepareShoppingSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'Item name is required'),
      quantity: z.number().nullable().optional(),
      unit: z.string().nullable().optional(),
      groceryTerm: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      note: z.string().nullable().optional(),
      packQuantity: z.number().nullable().optional(),
    })
  ).min(1, 'At least one ingredient must be selected'),
  meta: z.object({
    recipeTitle: z.string().nullable().optional(),
    servings: z.number().nullable().optional(),
  }).nullable().optional(),
  providerId: z.string().nullable().optional(),
});

/**
 * POST /shopping/prepare
 * Prepares selected ingredients for shopping or copy/share workflow.
 * Uses authenticated user session to retrieve user-scoped Swiggy token if connected.
 */
shoppingRouter.post('/shopping/prepare', optionalAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = prepareShoppingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid shopping request payload',
          details: parseResult.error.format(),
        },
      });
    }

    const { items, meta, providerId } = parseResult.data;

    const sanitizedItems = items.map((it) => ({
      id: it.id,
      name: it.name,
      quantity: typeof it.quantity === 'number' ? it.quantity : undefined,
      unit: it.unit || undefined,
      groceryTerm: it.groceryTerm || undefined,
      category: it.category || undefined,
      note: it.note || undefined,
      packQuantity: typeof it.packQuantity === 'number' ? it.packQuantity : undefined,
    }));

    let provider = providerId ? groceryRegistry.get(providerId) : undefined;
    if (!provider) {
      provider = groceryRegistry.getActiveProvider();
    }

    const sanitizedMeta = meta
      ? {
          recipeTitle: meta.recipeTitle || undefined,
          servings: typeof meta.servings === 'number' ? meta.servings : undefined,
        }
      : undefined;

    // Get user-scoped token if user is authenticated
    const userToken = await swiggyMcp.getUserToken(req.userId);
    const result = await (provider as any).prepare(sanitizedItems, sanitizedMeta, userToken || undefined);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error preparing shopping list:', error);
    return res.status(500).json({
      error: {
        code: 'SHOPPING_PREPARE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to prepare shopping list',
      },
    });
  }
});

/**
 * GET /shopping/providers
 * Returns available grocery shopping providers and user-scoped readiness status.
 */
shoppingRouter.get('/shopping/providers', optionalAuth, async (req: Request, res: Response) => {
  const copyList = groceryRegistry.get('copy_list');
  const instamart = groceryRegistry.get('instamart');
  const isSwiggyConnected = await swiggyMcp.isUserConnected(req.userId);

  return res.json({
    success: true,
    data: [
      {
        id: instamart?.id || 'instamart',
        name: 'Swiggy Instamart (Official MCP)',
        isAvailable: true,
        isConnected: isSwiggyConnected,
        type: 'instant_delivery',
        description: 'Instant 10-minute delivery powered by Swiggy Builders Club MCP',
      },
      {
        id: copyList?.id || 'copy_list',
        name: copyList?.name || 'Smart Grocery List',
        isAvailable: true,
        type: 'copy',
        description: 'Formatted categorized list for clipboard, WhatsApp, or notes',
      },
    ],
  });
});

/**
 * GET /shopping/swiggy/status
 * Check if current user has an active Swiggy MCP connection
 */
shoppingRouter.get('/shopping/swiggy/status', optionalAuth, async (req: Request, res: Response) => {
  const isConnected = await swiggyMcp.isUserConnected(req.userId);
  res.json({
    success: true,
    data: {
      isConnected,
      provider: 'Swiggy Instamart Builders Club MCP',
      endpoint: 'https://mcp.swiggy.com/im',
    },
  });
});

/**
 * GET /shopping/swiggy/addresses
 * Retrieves saved delivery addresses for current user.
 * Explicitly separates authentication failures from empty address lists.
 */
shoppingRouter.get('/shopping/swiggy/addresses', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userToken = await swiggyMcp.getUserToken(req.userId);
    if (!userToken) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Swiggy account is not connected. Please connect your account first.',
        },
      });
    }

    const addresses = await swiggyMcp.getAddresses(userToken);
    return res.json({
      success: true,
      data: {
        addresses,
        count: addresses.length,
        hasAddresses: addresses.length > 0,
      },
    });
  } catch (err: any) {
    if (err instanceof SwiggyAuthError || err.statusCode === 401) {
      return res.status(401).json({
        error: {
          code: err.code || 'AUTH_REQUIRED',
          message: err.message,
        },
      });
    }

    return res.status(500).json({
      error: {
        code: 'SWIGGY_ADDRESS_ERROR',
        message: err?.message || 'Failed to fetch saved delivery addresses from Swiggy Instamart.',
      },
    });
  }
});

/**
 * Resolves a safe, reachable Swiggy OAuth redirect URI.
 * Strictly filters out dead/temporary tunnels (e.g. trycloudflare.com) and localhost in production.
 */
function resolveSafeRedirectUri(requestedUri?: string): string {
  const fallback = 'https://aajkyabanaye-app.onrender.com/shopping/swiggy/callback';

  // 1. Explicit request query param
  if (requestedUri && typeof requestedUri === 'string') {
    const trimmed = requestedUri.trim();
    if (!trimmed.includes('trycloudflare.com') && (trimmed.startsWith('https://') || trimmed.startsWith('aajkyabanaye://'))) {
      if (process.env.NODE_ENV === 'production' && trimmed.includes('localhost')) {
        return fallback;
      }
      return trimmed;
    }
  }

  // 2. Server environment configuration
  const envUri = process.env.SWIGGY_REDIRECT_URI?.trim();
  if (envUri && !envUri.includes('trycloudflare.com') && (envUri.startsWith('https://') || envUri.startsWith('aajkyabanaye://'))) {
    if (process.env.NODE_ENV === 'production' && envUri.includes('localhost')) {
      return fallback;
    }
    return envUri;
  }

  // 3. Fallback to live production Render callback
  return fallback;
}

/**
 * GET /shopping/swiggy/auth-url
 * Initiate OAuth 2.1 PKCE authorization flow for Swiggy MCP.
 * Persists state session in MongoDB to survive restarts and multi-instance load.
 */
shoppingRouter.get('/shopping/swiggy/auth-url', optionalAuth, async (req: Request, res: Response) => {
  const customUri = req.query.redirectUri as string | undefined;
  const redirectUri = resolveSafeRedirectUri(customUri);
  const state = req.query.state as string | undefined;

  const { authUrl, state: csrfState } = await swiggyMcp.createAuthUrl(redirectUri, req.userId, state);

  res.json({
    success: true,
    data: {
      authUrl,
      state: csrfState,
      redirectUri,
    },
  });
});

/**
 * POST /shopping/swiggy/exchange
 * Exchanges code received via client-side AuthSession with secure state validation
 */
shoppingRouter.post('/shopping/swiggy/exchange', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;
    if (!code) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing authorization code' } });
    }

    // Atomically consume state session to prevent replay attacks
    const session = await swiggyMcp.consumeSessionForState(String(state));
    if (!session) {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Invalid or expired state session' } });
    }

    const redirectUri = resolveSafeRedirectUri(session.redirectUri);
    const verifier = session.codeVerifier;

    const boundUserId = session.clerkUserId || req.userId;
    const tokenData = await swiggyMcp.exchangeCode(code, verifier, redirectUri, boundUserId);

    return res.json({
      success: true,
      data: {
        isConnected: true,
        expiresIn: tokenData.expires_in,
      },
    });
  } catch (err: any) {
    console.error('Swiggy token exchange failed:', err);
    return res.status(500).json({
      error: { code: 'EXCHANGE_FAILED', message: err?.message || 'Token exchange failed' },
    });
  }
});

/**
 * GET /shopping/swiggy/callback
 * Handles OAuth 2.1 PKCE callback from Swiggy with secure state validation
 */
shoppingRouter.get('/shopping/swiggy/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h2>Swiggy Connection Failed</h2>
            <p>${error_description || error}</p>
          </body>
        </html>
      `);
    }

    if (!code || typeof code !== 'string') {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Swiggy OAuth Callback — AajKyaBanaye</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FFF9F0; color: #252923; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
              .card { background: #FFFFFF; max-width: 480px; width: 100%; padding: 36px 28px; border-radius: 20px; border: 1px solid #ECE8DF; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; }
              .badge { display: inline-block; background: #DCFCE7; color: #15803D; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; border: 1px solid #86EFAC; }
              h1 { font-size: 20px; margin: 0 0 10px; color: #245C45; }
              p { font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 20px; }
              .info { background: #F8F6F0; border-radius: 12px; padding: 12px 16px; font-size: 12.5px; color: #666; text-align: left; }
              .info code { color: #245C45; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">● Active & Ready</div>
              <h1>Swiggy OAuth Callback Endpoint</h1>
              <p>This endpoint is live and configured to receive authorization redirects from <strong>Swiggy Builders Club MCP</strong> for the AajKyaBanaye application.</p>
              <div class="info">
                <strong>Protocol:</strong> OAuth 2.1 PKCE (S256)<br/>
                <strong>App Scheme:</strong> <code>aajkyabanaye://oauth/swiggy</code><br/>
                <strong>Status:</strong> Waiting for authorization code handshake.
              </div>
            </div>
          </body>
        </html>
      `);
    }

    // Atomically consume state session
    const session = await swiggyMcp.consumeSessionForState(String(state));
    if (!session) {
      return res.status(400).send('Invalid or expired OAuth state');
    }

    await swiggyMcp.exchangeCode(code, session.codeVerifier, resolveSafeRedirectUri(session.redirectUri), session.clerkUserId);

    res.send(`
      <html>
        <head>
          <title>Swiggy Instamart Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #FFF9F0; color: #252923;">
          <h2 style="color: #245C45;">✅ Swiggy Instamart Connected!</h2>
          <p>Your AajKyaBanaye kitchen is now securely connected to Swiggy Builders Club MCP.</p>
          <p style="color: #777D76; font-size: 14px;">You can now return to the app to order groceries in 1 tap.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Swiggy callback error:', err);
    res.status(500).send('Error exchanging Swiggy token');
  }
});

/**
 * POST /shopping/swiggy/search
 * Proxies live product search to Swiggy Instamart via MCP
 */
shoppingRouter.post('/shopping/swiggy/search', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { query, addressId } = req.body;
    if (!query) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Query is required' } });
    }

    const userToken = await swiggyMcp.getUserToken(req.userId);
    const products = await swiggyMcp.searchProducts(query, addressId, userToken || undefined);
    res.json({
      success: true,
      data: products,
    });
  } catch (err: any) {
    res.status(500).json({
      error: { code: 'SWIGGY_SEARCH_ERROR', message: err.message },
    });
  }
});

/**
 * POST /shopping/swiggy/connect-token
 * Manually connect or update Swiggy MCP access token for authenticated user
 */
shoppingRouter.post('/shopping/swiggy/connect-token', requireAuth, async (req: Request, res: Response) => {
  const { token, expiresIn } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Token is required' } });
  }

  await swiggyMcp.setUserToken(req.userId!, {
    access_token: token,
    token_type: 'Bearer',
    expires_in: typeof expiresIn === 'number' ? expiresIn : 86400 * 30,
  });

  return res.json({
    success: true,
    data: {
      isConnected: true,
      message: 'Swiggy MCP token saved securely for your account.',
    },
  });
});

/**
 * POST /shopping/swiggy/disconnect
 * Disconnects and revokes current user's Swiggy session
 */
shoppingRouter.post('/shopping/swiggy/disconnect', requireAuth, async (req: Request, res: Response) => {
  await swiggyMcp.clearUserToken(req.userId!);
  return res.json({
    success: true,
    data: {
      isConnected: false,
      message: 'Swiggy Instamart disconnected successfully.',
    },
  });
});
