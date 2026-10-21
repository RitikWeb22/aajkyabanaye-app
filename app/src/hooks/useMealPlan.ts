import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/expo';
import { apiClient } from '../services/api/apiClient';

export interface PlannedMealEntry {
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
}

export function useMealPlan(weekStart?: string) {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['meal-plan', weekStart],
    queryFn: async () => {
      const res = await apiClient.getMealPlan(weekStart);
      return res.data;
    },
    enabled: Boolean(isSignedIn),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAddMealPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
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
    }) => {
      const res = await apiClient.addMealPlanEntry(entry);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', variables.weekStart] });
    },
  });
}

export function useDeleteMealPlanEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, weekStart }: { entryId: string; weekStart?: string }) => {
      return apiClient.deleteMealPlanEntry(entryId, weekStart);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', variables.weekStart] });
    },
  });
}

export function useMealPlanSuggestions(date: string, slot: string, enabled = true) {
  return useQuery({
    queryKey: ['meal-plan-suggestions', date, slot],
    queryFn: async () => {
      const res = await apiClient.getMealPlanSuggestions(date, slot);
      return res.data;
    },
    enabled: Boolean(enabled && date && slot),
    staleTime: 1000 * 60 * 10,
  });
}

export function useGenerateGroceryFromMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ weekStart, title }: { weekStart?: string; title?: string }) => {
      const res = await apiClient.generateGroceryListFromMealPlan(weekStart, title);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
  });
}
