import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api/apiClient';
import { Recipe, RecipeFilterParams, BannerItem, RecentlyViewedItem } from '../types/recipe';

export interface UseRecipesResult {
  recipes: Recipe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Fetch paginated recipes list with filters
 */
export function useRecipes(params?: RecipeFilterParams) {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: async () => {
      const response = await apiClient.getRecipes(params);
      return {
        recipes: response.data,
        pagination: response.pagination,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 mins cache
  });
}

/**
 * Infinite query for Discover screen infinite scrolling
 */
export function useInfiniteRecipes(params?: Omit<RecipeFilterParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['infinite-recipes', params],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.getRecipes({
        ...params,
        page: pageParam as number,
      });
      return {
        recipes: response.data,
        pagination: response.pagination,
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch single recipe details by composite ID (e.g. `themealdb:52865`)
 */
export function useRecipeDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      if (!id) throw new Error('Recipe ID is required');
      const response = await apiClient.getRecipeById(id);
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });
}

/**
 * Fetch related recipes recommendation
 */
export function useRelatedRecipes(id: string | undefined) {
  return useQuery({
    queryKey: ['recipe', id, 'related'],
    queryFn: async () => {
      if (!id) return [];
      const response = await apiClient.getRelatedRecipes(id);
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch active promotional & discovery banners
 */
export function useBanners() {
  return useQuery<BannerItem[]>({
    queryKey: ['banners'],
    queryFn: async () => {
      const response = await apiClient.getBanners();
      return response.data;
    },
    staleTime: 1000 * 60 * 15,
  });
}

/**
 * Fetch recently viewed recipes for the authenticated user
 */
export function useRecentlyViewed(enabled = true) {
  return useQuery<RecentlyViewedItem[]>({
    queryKey: ['recently-viewed'],
    queryFn: async () => {
      try {
        const response = await apiClient.getRecentlyViewed();
        return response.data || [];
      } catch (err: any) {
        if (err?.status === 401 || err?.code === 'UNAUTHORIZED') {
          return [];
        }
        return [];
      }
    },
    enabled,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Record a recipe view mutation
 */
export function useRecordRecentlyViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipeId,
      snapshot,
    }: {
      recipeId: string;
      snapshot: {
        title: string;
        image?: string;
        cuisine?: string;
        isVeg?: boolean;
        cookTimeMins?: number;
        servings?: number;
        difficulty?: string;
      };
    }) => {
      return await apiClient.recordRecentlyViewed(recipeId, snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recently-viewed'] });
    },
  });
}

/**
 * Clear recently viewed recipes mutation
 */
export function useClearRecentlyViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await apiClient.clearRecentlyViewed();
    },
    onSuccess: () => {
      queryClient.setQueryData(['recently-viewed'], []);
      queryClient.invalidateQueries({ queryKey: ['recently-viewed'] });
    },
  });
}

// --- Phase 6: Smart Search Hooks ---

export interface SmartSearchParams {
  q?: string;
  ingredients?: string;
  category?: string;
  cuisine?: string;
  diet?: 'veg' | 'non-veg' | 'vegan';
  maxTime?: number;
  page?: number;
  limit?: number;
}

export function useSmartSearch(params: SmartSearchParams, enabled: boolean = true) {
  return useQuery({
    queryKey: ['smart-search', params],
    queryFn: async () => {
      return await apiClient.smartSearch(params);
    },
    enabled: enabled && Boolean(params.q || params.ingredients || params.category),
    staleTime: 1000 * 60 * 3,
  });
}

export function useSearchSuggestions(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search-suggestions', trimmed],
    queryFn: async () => {
      const res = await apiClient.getSearchSuggestions(trimmed);
      return res.data;
    },
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePopularSearches() {
  return useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      const res = await apiClient.getPopularSearches();
      return res.data;
    },
    staleTime: 1000 * 60 * 30, // 30 mins cache
  });
}

// --- Phase 7: AI Recipe Generation Hooks ---

export interface GenerateAiRecipeParams {
  prompt?: string;
  ingredients?: string[];
  dietary?: 'veg' | 'non-veg' | 'vegan';
  cuisine?: string;
  servings?: number;
  maxTime?: number;
  exclusions?: string[];
  allergies?: string[];
}

export function useGenerateAiRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: GenerateAiRecipeParams) => {
      return await apiClient.generateAiRecipe(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-quota'] });
      queryClient.invalidateQueries({ queryKey: ['my-ai-recipes'] });
    },
  });
}

export function useAiQuota(enabled: boolean = true) {
  return useQuery({
    queryKey: ['ai-quota'],
    queryFn: async () => {
      const res = await apiClient.getAiQuota();
      return res.data;
    },
    enabled,
    staleTime: 1000 * 60 * 1, // 1 min cache
  });
}

export function useMyAiRecipes(enabled: boolean = true) {
  return useQuery({
    queryKey: ['my-ai-recipes'],
    queryFn: async () => {
      const res = await apiClient.getMyAiRecipes();
      return res.data;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}


