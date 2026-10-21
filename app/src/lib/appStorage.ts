import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { StateStorage } from 'zustand/middleware';

export const appStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(name);
        }
        return null;
      }
      return await SecureStore.getItemAsync(name);
    } catch (err) {
      console.warn('appStorage.getItem error:', err);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(name, value);
        }
        return;
      }
      await SecureStore.setItemAsync(name, value);
    } catch (err) {
      console.warn('appStorage.setItem error:', err);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(name);
        }
        return;
      }
      await SecureStore.deleteItemAsync(name);
    } catch (err) {
      console.warn('appStorage.removeItem error:', err);
    }
  },
};
