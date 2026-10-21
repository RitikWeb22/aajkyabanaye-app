import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from '../lib/appStorage';

interface AppState {
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  // Selected ingredients keyed by recipe ID
  selectedIngredients: Record<string, string[]>;
  toggleIngredient: (recipeId: string, ingredientId: string) => void;
  setSelectedIngredients: (recipeId: string, ingredientIds: string[]) => void;
  selectAllIngredients: (recipeId: string, allIds: string[]) => void;
  clearSelectedIngredients: (recipeId: string) => void;
  // Pantry / already have items keyed by recipe ID
  alreadyHaveIngredients: Record<string, string[]>;
  toggleAlreadyHave: (recipeId: string, ingredientId: string) => void;
  // Scaled Servings keyed by recipe ID
  customServings: Record<string, number>;
  setCustomServings: (recipeId: string, servings: number) => void;
  // Cooking step checklist keyed by recipe ID
  completedSteps: Record<string, number[]>;
  toggleStepDone: (recipeId: string, stepOrder: number) => void;
  resetStepsDone: (recipeId: string) => void;
  // User Kitchen & Dietary Preferences
  dietaryPreferences: string[];
  favoriteCuisines: string[];
  spiceLevel: string;
  cookingLevel: string;
  cookingTimeMins: number;
  chefBio: string;
  phoneNumber: string;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  setKitchenPreferences: (prefs: {
    dietaryPreferences?: string[];
    favoriteCuisines?: string[];
    spiceLevel?: string;
    cookingLevel?: string;
    cookingTimeMins?: number;
    chefBio?: string;
    phoneNumber?: string;
    avatarUrl?: string;
  }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),

      dietaryPreferences: ['Vegetarian'],
      favoriteCuisines: ['North Indian', 'Street Food'],
      spiceLevel: 'Medium',
      cookingLevel: 'Home Cook',
      cookingTimeMins: 30,
      chefBio: 'Passionate home cook exploring authentic Indian delicacies.',
      phoneNumber: '',
      avatarUrl: '',
      setAvatarUrl: (url) => set({ avatarUrl: url }),
      setKitchenPreferences: (prefs) => set((state) => ({ ...state, ...prefs })),

      recentSearches: ['Paneer Butter Masala', 'Quick Breakfast', 'High Protein Dinner'],
      addRecentSearch: (query) =>
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;
          const filtered = state.recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
          return { recentSearches: [trimmed, ...filtered].slice(0, 10) };
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),

      selectedIngredients: {},
      toggleIngredient: (recipeId, ingredientId) =>
        set((state) => {
          const current = state.selectedIngredients[recipeId] || [];
          const updated = current.includes(ingredientId)
            ? current.filter((id) => id !== ingredientId)
            : [...current, ingredientId];
          return {
            selectedIngredients: {
              ...state.selectedIngredients,
              [recipeId]: updated,
            },
          };
        }),
      setSelectedIngredients: (recipeId, ingredientIds) =>
        set((state) => ({
          selectedIngredients: {
            ...state.selectedIngredients,
            [recipeId]: ingredientIds,
          },
        })),
      selectAllIngredients: (recipeId, allIds) =>
        set((state) => ({
          selectedIngredients: {
            ...state.selectedIngredients,
            [recipeId]: allIds,
          },
        })),
      clearSelectedIngredients: (recipeId) =>
        set((state) => ({
          selectedIngredients: {
            ...state.selectedIngredients,
            [recipeId]: [],
          },
        })),

      alreadyHaveIngredients: {},
      toggleAlreadyHave: (recipeId, ingredientId) =>
        set((state) => {
          const current = state.alreadyHaveIngredients[recipeId] || [];
          const updated = current.includes(ingredientId)
            ? current.filter((id) => id !== ingredientId)
            : [...current, ingredientId];
          return {
            alreadyHaveIngredients: {
              ...state.alreadyHaveIngredients,
              [recipeId]: updated,
            },
          };
        }),

      customServings: {},
      setCustomServings: (recipeId, servings) =>
        set((state) => ({
          customServings: {
            ...state.customServings,
            [recipeId]: servings,
          },
        })),

      completedSteps: {},
      toggleStepDone: (recipeId, stepOrder) =>
        set((state) => {
          const current = state.completedSteps[recipeId] || [];
          const updated = current.includes(stepOrder)
            ? current.filter((order) => order !== stepOrder)
            : [...current, stepOrder];
          return {
            completedSteps: {
              ...state.completedSteps,
              [recipeId]: updated,
            },
          };
        }),
      resetStepsDone: (recipeId) =>
        set((state) => ({
          completedSteps: {
            ...state.completedSteps,
            [recipeId]: [],
          },
        })),
    }),
    {
      name: 'aajkyabanaye-app-storage',
      storage: createJSONStorage(() => appStorage),
    }
  )
);
