import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/expo';
import { apiClient } from '../services/api/apiClient';

export interface GroceryItemData {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category: string;
  purchased: boolean;
  note?: string;
}

export function useGroceryLists() {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['grocery-lists'],
    queryFn: async () => {
      const res = await apiClient.getGroceryLists();
      return res.data;
    },
    enabled: Boolean(isSignedIn),
    staleTime: 1000 * 60 * 2,
  });
}

export function useGroceryList(id?: string) {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['grocery-list', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.getGroceryList(id);
      return res.data;
    },
    enabled: Boolean(isSignedIn && id),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      items?: Array<{ name: string; quantity?: number; unit?: string; category?: string; note?: string }>;
      sourceRecipeIds?: string[];
    }) => {
      const res = await apiClient.createGroceryList(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
  });
}

export function useAddGroceryListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      item,
    }: {
      listId: string;
      item: { name: string; quantity?: number; unit?: string; category?: string; note?: string };
    }) => {
      const res = await apiClient.addGroceryListItem(listId, item);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grocery-list', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
  });
}

export function useUpdateGroceryListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      itemId,
      updates,
    }: {
      listId: string;
      itemId: string;
      updates: { purchased?: boolean; quantity?: number; unit?: string; name?: string; note?: string };
    }) => {
      const res = await apiClient.updateGroceryListItem(listId, itemId, updates);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grocery-list', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
  });
}

export function useDeleteGroceryListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, itemId }: { listId: string; itemId: string }) => {
      return apiClient.deleteGroceryListItem(listId, itemId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grocery-list', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
  });
}

export function useDeleteGroceryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      return apiClient.deleteGroceryList(listId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] });
    },
  });
}
