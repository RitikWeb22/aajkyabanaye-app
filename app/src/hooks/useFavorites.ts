import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/expo';
import { apiClient } from '../services/api/apiClient';

export interface FavoriteRecipeSnapshot {
  title: string;
  image?: string;
  cuisine?: string;
  isVeg?: boolean;
  cookTimeMins?: number;
  servings?: number;
  difficulty?: string;
}

export function useFavorites() {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await apiClient.getFavorites();
      return res.data;
    },
    enabled: Boolean(isSignedIn),
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

export function useIsFavorite(recipeId?: string) {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['favorite-check', recipeId],
    queryFn: async () => {
      if (!recipeId) return false;
      const res = await apiClient.checkFavorite(recipeId);
      return res.isFavorited;
    },
    enabled: Boolean(isSignedIn && recipeId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  return useMutation({
    mutationFn: async ({
      recipeId,
      isCurrentlyFavorited,
      snapshot,
    }: {
      recipeId: string;
      isCurrentlyFavorited: boolean;
      snapshot: FavoriteRecipeSnapshot;
    }) => {
      if (!isSignedIn) {
        throw new Error('SIGN_IN_REQUIRED');
      }

      if (isCurrentlyFavorited) {
        await apiClient.removeFavorite(recipeId);
        return { recipeId, isFavorited: false };
      } else {
        await apiClient.addFavorite(recipeId, snapshot);
        return { recipeId, isFavorited: true };
      }
    },
    onMutate: async ({ recipeId, isCurrentlyFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ['favorite-check', recipeId] });
      const prevCheck = queryClient.getQueryData(['favorite-check', recipeId]);

      // Optimistically flip state
      queryClient.setQueryData(['favorite-check', recipeId], !isCurrentlyFavorited);

      return { prevCheck };
    },
    onError: (_err, variables, context) => {
      if (context?.prevCheck !== undefined) {
        queryClient.setQueryData(['favorite-check', variables.recipeId], context.prevCheck);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorite-check', variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
