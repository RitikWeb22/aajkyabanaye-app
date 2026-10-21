import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/expo';
import { apiClient } from '../services/api/apiClient';
import { useAppStore } from '../store/useAppStore';

export function useUserProfile() {
  const { isSignedIn } = useAuth();
  const setAvatarUrl = useAppStore((s) => s.setAvatarUrl);

  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await apiClient.getProfile();
      if (res?.data?.avatarUrl) {
        setAvatarUrl(res.data.avatarUrl);
      }
      return res.data;
    },
    enabled: Boolean(isSignedIn),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setAvatarUrl = useAppStore((s) => s.setAvatarUrl);

  return useMutation({
    mutationFn: async (profileData: {
      displayName?: string;
      dietaryPreferences?: string[];
      favoriteCuisines?: string[];
      allergies?: string[];
      preferredCookingTimeMins?: number;
      theme?: 'light' | 'dark' | 'system';
      avatarUrl?: string;
    }) => {
      const res = await apiClient.updateProfile(profileData);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const setAvatarUrl = useAppStore((s) => s.setAvatarUrl);

  return useMutation({
    mutationFn: async (base64Image: string) => {
      const res = await apiClient.uploadAvatar(base64Image);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}
