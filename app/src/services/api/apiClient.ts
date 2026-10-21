import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Recipe, RecipeFilterParams, BannerItem, RecentlyViewedItem } from '../../types/recipe';

export function resolveApiBaseUrl(): string {
  // 1. If explicit non-localhost URL is provided (e.g. production domain or specific LAN IP)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  // On Web browser, use current page hostname:5000 or localhost
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }

  // If envUrl is explicitly a remote/LAN IP (not localhost), use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. On Native devices (physical phone or emulator running Expo):
  // Automatically extract the host machine's LAN IP from the Expo bundler connection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5000`;
    }
  }

  // 3. Fallback for Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
}

export const API_BASE_URL = resolveApiBaseUrl();

class ApiClient {
  private token: string | null = null;
  private tokenProvider: (() => Promise<string | null>) | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  setTokenProvider(provider: (() => Promise<string | null>) | null) {
    this.tokenProvider = provider;
  }

  async getActiveToken(): Promise<string | null> {
    if (this.tokenProvider) {
      try {
        const token = await this.tokenProvider();
        if (token) return token;
      } catch {
        // Fallback to static token
      }
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = resolveApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const activeToken = await this.getActiveToken();
    if (activeToken) {
      headers.Authorization = `Bearer ${activeToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error?.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        (error as any).code = data?.error?.code || 'API_ERROR';
        (error as any).status = response.status;
        throw error;
      }

      return data;
    } catch (err: any) {
      console.warn(`[ApiClient] Request to ${url} failed:`, err?.message || err);
      throw err;
    }
  }

  async getHealth() {
    return this.request<{ status: string; database: { connected: boolean } }>('/health');
  }

  async getProfile() {
    return this.request<{ data: any }>('/me/profile');
  }

  async updateProfile(profileData: any) {
    return this.request<{ data: any; message: string }>('/me/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Upload user profile photo to Cloudinary
   */
  async uploadAvatar(image: string): Promise<{
    success: boolean;
    data: { avatarUrl: string; profile: any };
    message: string;
  }> {
    return this.request('/me/avatar', {
      method: 'POST',
      body: JSON.stringify({ image }),
    });
  }

  // --- Phase 4: Recipe Data Layer ---

  /**
   * Paginated recipes discovery with multi-criteria filters
   */
  async getRecipes(params?: RecipeFilterParams): Promise<{
    data: Recipe[];
    pagination: { page: number; limit: number; total: number; hasMore: boolean };
  }> {
    const queryParts: string[] = [];
    if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
    if (params?.category && params.category !== 'all') queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.cuisine) queryParts.push(`cuisine=${encodeURIComponent(params.cuisine)}`);
    if (params?.diet) queryParts.push(`diet=${encodeURIComponent(params.diet)}`);
    if (params?.maxTime) queryParts.push(`maxTime=${encodeURIComponent(String(params.maxTime))}`);
    if (params?.difficulty) queryParts.push(`difficulty=${encodeURIComponent(params.difficulty)}`);
    if (params?.page) queryParts.push(`page=${encodeURIComponent(String(params.page))}`);
    if (params?.limit) queryParts.push(`limit=${encodeURIComponent(String(params.limit))}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.request(`/recipes${qs}`);
  }

  /**
   * Retrieve single recipe detail by ID (e.g. `themealdb:52865`)
   */
  async getRecipeById(id: string): Promise<{ data: Recipe }> {
    return this.request(`/recipes/${encodeURIComponent(id)}`);
  }

  /**
   * Retrieve related recipe recommendations
   */
  async getRelatedRecipes(id: string): Promise<{ data: Recipe[] }> {
    return this.request(`/recipes/${encodeURIComponent(id)}/related`);
  }

  // --- Phase 5: Discovery UI & Banners ---

  /**
   * Fetch active promotional & discovery banners
   */
  async getBanners(): Promise<{ data: BannerItem[] }> {
    return this.request('/banners');
  }

  /**
   * Fetch recently viewed recipes for the authenticated user
   */
  async getRecentlyViewed(): Promise<{ data: RecentlyViewedItem[] }> {
    return this.request('/me/recently-viewed');
  }

  /**
   * Record a recipe view
   */
  async recordRecentlyViewed(
    recipeId: string,
    snapshot: {
      title: string;
      image?: string;
      cuisine?: string;
      isVeg?: boolean;
      cookTimeMins?: number;
      servings?: number;
      difficulty?: string;
    }
  ): Promise<{ success: boolean }> {
    return this.request('/me/recently-viewed', {
      method: 'POST',
      body: JSON.stringify({ recipeId, snapshot }),
    });
  }

  /**
   * Clear all recently viewed recipes
   */
  async clearRecentlyViewed(): Promise<{ success: boolean }> {
    return this.request('/me/recently-viewed', {
      method: 'DELETE',
    });
  }

  // --- Phase 6: Smart Search ---

  /**
   * Smart multi-criteria search with intent parsing, fuzzy matching & ranking
   */
  async smartSearch(params: {
    q?: string;
    ingredients?: string;
    category?: string;
    cuisine?: string;
    diet?: 'veg' | 'non-veg' | 'vegan';
    maxTime?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    data: (Recipe & { matchQuality?: 'high' | 'medium' | 'low'; matchedIngredients?: string[] })[];
    parsedIntent: {
      originalQuery: string;
      cleanedQuery: string;
      dishName?: string;
      ingredients: string[];
      cuisine?: string;
      diet?: 'veg' | 'non-veg' | 'vegan';
      maxTime?: number;
      exclusions: string[];
      category?: string;
      isIngredientSearch: boolean;
    };
    suggestAi: boolean;
    pagination: { page: number; limit: number; total: number; hasMore: boolean };
  }> {
    const queryParts: string[] = [];
    if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
    if (params.ingredients) queryParts.push(`ingredients=${encodeURIComponent(params.ingredients)}`);
    if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params.cuisine) queryParts.push(`cuisine=${encodeURIComponent(params.cuisine)}`);
    if (params.diet) queryParts.push(`diet=${encodeURIComponent(params.diet)}`);
    if (params.maxTime) queryParts.push(`maxTime=${encodeURIComponent(String(params.maxTime))}`);
    if (params.page) queryParts.push(`page=${encodeURIComponent(String(params.page))}`);
    if (params.limit) queryParts.push(`limit=${encodeURIComponent(String(params.limit))}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.request(`/search${qs}`);
  }

  /**
   * Fetch real-time autocompletions for search query
   */
  async getSearchSuggestions(q: string): Promise<{ data: string[] }> {
    return this.request(`/search/suggestions?q=${encodeURIComponent(q)}`);
  }

  /**
   * Fetch popular/trending culinary queries
   */
  async getPopularSearches(): Promise<{
    data: { query: string; category?: string; isVeg?: boolean }[];
  }> {
    return this.request('/search/popular');
  }

  // --- Phase 7: AI Recipe Generation ---

  /**
   * Request AI to invent an authentic recipe matching specifications
   */
  async generateAiRecipe(params: {
    prompt?: string;
    ingredients?: string[];
    dietary?: 'veg' | 'non-veg' | 'vegan';
    cuisine?: string;
    servings?: number;
    maxTime?: number;
    exclusions?: string[];
    allergies?: string[];
  }): Promise<{
    data: Recipe;
    quota: { used: number; limit: number; remaining: number };
  }> {
    return this.request('/ai/recipes/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Fetch user's remaining daily AI generation quota
   */
  async getAiQuota(): Promise<{
    data: { allowed: boolean; used: number; limit: number; remaining: number; dateKey: string };
  }> {
    try {
      return await this.request('/ai/quota');
    } catch {
      return {
        data: {
          allowed: true,
          used: 0,
          limit: 5,
          remaining: 5,
          dateKey: new Date().toISOString().split('T')[0],
        },
      };
    }
  }

  /**
   * Fetch authenticated user's previously generated AI recipes
   */
  async getMyAiRecipes(): Promise<{ data: Recipe[] }> {
    return this.request('/me/ai-recipes');
  }

  // --- Phase 9: Shopping Workflow ---

  /**
   * Prepare selected ingredients for shopping, copying, or export
   */
  async prepareShoppingList(payload: {
    items: {
      id: string;
      name: string;
      quantity?: number;
      unit?: string;
      groceryTerm?: string;
      category?: string;
      note?: string;
    }[];
    meta?: {
      recipeTitle?: string;
      servings?: number;
    };
    providerId?: string;
  }): Promise<{
    success: boolean;
    data: {
      provider: string;
      type: 'copied' | 'deeplink' | 'cart_created';
      url?: string;
      text: string;
      itemCount: number;
      message: string;
      isConnected?: boolean;
      items?: Array<{
        name: string;
        quantity?: number;
        unit?: string;
        groceryTerm?: string;
        searchUrl?: string;
        product?: any;
      }>;
      cartSummary?: {
        itemTotal: number;
        deliveryFee: number;
        grandTotal: number;
        etaMinutes: number;
      };
    };
  }> {
    return this.request('/shopping/prepare', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get available shopping providers and their readiness status
   */
  async getShoppingProviders(): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      isAvailable: boolean;
      isConnected?: boolean;
      type: string;
      description: string;
    }[];
  }> {
    return this.request('/shopping/providers');
  }

  /**
   * Check Swiggy Builders Club MCP connection status
   */
  async getSwiggyStatus(): Promise<{
    success: boolean;
    data: { isConnected: boolean; provider: string; endpoint: string };
  }> {
    return this.request('/shopping/swiggy/status');
  }

  /**
   * Fetch Swiggy OAuth 2.1 PKCE authorization URL
   */
  async getSwiggyAuthUrl(): Promise<{
    success: boolean;
    data: { authUrl: string; state: string; redirectUri: string };
  }> {
    return this.request('/shopping/swiggy/auth-url');
  }

  /**
   * Exchange Swiggy OAuth authorization code for access token
   */
  async exchangeSwiggyCode(
    code: string,
    state?: string
  ): Promise<{ success: boolean; data: { isConnected: boolean; expiresIn?: number } }> {
    return this.request('/shopping/swiggy/exchange', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  /**
   * Search live Instamart products for an ingredient query
   */
  async searchSwiggyProducts(query: string): Promise<{
    success: boolean;
    data: any[];
  }> {
    return this.request('/shopping/swiggy/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  /**
   * Connect Swiggy MCP in instant Demo mode for local testing
   */
  async demoConnectSwiggy(): Promise<{
    success: boolean;
    data: { isConnected: boolean; message: string };
  }> {
    return this.request('/shopping/swiggy/demo-connect', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  /**
   * Disconnect Swiggy session
   */
  async disconnectSwiggy(): Promise<{
    success: boolean;
    data: { isConnected: boolean };
  }> {
    return this.request('/shopping/swiggy/disconnect', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // --- Phase 10: Favorites ---

  async getFavorites(): Promise<{
    data: Array<{
      id: string;
      source: string;
      externalId: string;
      title: string;
      image?: string;
      cuisine?: string;
      isVeg?: boolean;
      cookTimeMins?: number;
      servings?: number;
      difficulty?: string;
      createdAt: string;
    }>;
  }> {
    return this.request('/me/favorites');
  }

  async checkFavorite(recipeId: string): Promise<{ isFavorited: boolean }> {
    return this.request(`/me/favorites/check?recipeId=${encodeURIComponent(recipeId)}`);
  }

  async addFavorite(
    recipeId: string,
    snapshot: {
      title: string;
      image?: string;
      cuisine?: string;
      isVeg?: boolean;
      cookTimeMins?: number;
      servings?: number;
      difficulty?: string;
    }
  ): Promise<{ success: boolean; data: any; message: string }> {
    return this.request('/me/favorites', {
      method: 'POST',
      body: JSON.stringify({ recipeId, snapshot }),
    });
  }

  async removeFavorite(recipeId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/me/favorites/${encodeURIComponent(recipeId)}`, {
      method: 'DELETE',
    });
  }

  // --- Phase 10: Grocery Lists ---

  async getGroceryLists(): Promise<{
    data: Array<{
      id: string;
      name: string;
      sourceRecipeIds: string[];
      itemCount: number;
      purchasedCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    return this.request('/me/grocery-lists');
  }

  async createGroceryList(payload: {
    name?: string;
    items?: Array<{
      name: string;
      quantity?: number;
      unit?: string;
      category?: string;
      note?: string;
    }>;
    sourceRecipeIds?: string[];
  }): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      sourceRecipeIds: string[];
      items: Array<{
        id: string;
        name: string;
        quantity?: number;
        unit?: string;
        category: string;
        purchased: boolean;
        note?: string;
      }>;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.request('/me/grocery-lists', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getGroceryList(id: string): Promise<{
    data: {
      id: string;
      name: string;
      sourceRecipeIds: string[];
      items: Array<{
        id: string;
        name: string;
        quantity?: number;
        unit?: string;
        category: string;
        purchased: boolean;
        note?: string;
      }>;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.request(`/me/grocery-lists/${id}`);
  }

  async updateGroceryList(
    id: string,
    payload: {
      name?: string;
      items?: Array<{
        id?: string;
        name: string;
        quantity?: number;
        unit?: string;
        category?: string;
        purchased?: boolean;
        note?: string;
      }>;
    }
  ): Promise<{ success: boolean; data: any }> {
    return this.request(`/me/grocery-lists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteGroceryList(id: string): Promise<{ success: boolean }> {
    return this.request(`/me/grocery-lists/${id}`, {
      method: 'DELETE',
    });
  }

  async addGroceryListItem(
    listId: string,
    item: {
      name: string;
      quantity?: number;
      unit?: string;
      category?: string;
      note?: string;
    }
  ): Promise<{ success: boolean; data: any }> {
    return this.request(`/me/grocery-lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateGroceryListItem(
    listId: string,
    itemId: string,
    updates: {
      purchased?: boolean;
      quantity?: number;
      unit?: string;
      name?: string;
      note?: string;
    }
  ): Promise<{ success: boolean; data: any }> {
    return this.request(`/me/grocery-lists/${listId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteGroceryListItem(listId: string, itemId: string): Promise<{ success: boolean }> {
    return this.request(`/me/grocery-lists/${listId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // --- Phase 10: Meal Plans ---

  async getMealPlan(weekStart?: string): Promise<{
    data: {
      id: string;
      weekStart: string;
      entries: Array<{
        id: string;
        date: string;
        slot: 'breakfast' | 'lunch' | 'snack' | 'dinner';
        recipeRef: { source: string; externalId: string };
        servings: number;
        snapshot: {
          title: string;
          image?: string;
          cuisine?: string;
          isVeg?: boolean;
          cookTimeMins?: number;
        };
      }>;
    };
  }> {
    const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
    return this.request(`/me/meal-plans${qs}`);
  }

  async addMealPlanEntry(entry: {
    weekStart: string;
    date: string;
    slot: 'breakfast' | 'lunch' | 'snack' | 'dinner';
    recipeId: string;
    servings: number;
    snapshot: {
      title: string;
      image?: string;
      cuisine?: string;
      isVeg?: boolean;
      cookTimeMins?: number;
    };
  }): Promise<{ success: boolean; data: any }> {
    return this.request('/me/meal-plans/entry', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async deleteMealPlanEntry(entryId: string, weekStart?: string): Promise<{ success: boolean }> {
    const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
    return this.request(`/me/meal-plans/entry/${entryId}${qs}`, {
      method: 'DELETE',
    });
  }

  async getMealPlanSuggestions(
    date: string,
    slot: string
  ): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      title: string;
      image?: string;
      cuisine: string;
      isVeg: boolean;
      cookTimeMins: number;
      servings: number;
    }>;
  }> {
    return this.request('/me/meal-plans/suggest', {
      method: 'POST',
      body: JSON.stringify({ date, slot }),
    });
  }

  async generateGroceryListFromMealPlan(
    weekStart?: string,
    title?: string
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      itemCount: number;
      items: any[];
      createdAt: string;
    };
    message: string;
  }> {
    return this.request('/me/meal-plans/grocery-list', {
      method: 'POST',
      body: JSON.stringify({ weekStart, title }),
    });
  }
}

export const apiClient = new ApiClient();
