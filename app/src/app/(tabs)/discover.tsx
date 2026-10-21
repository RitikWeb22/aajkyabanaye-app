import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { Colors } from '../../constants/theme';
import {
  SearchBar,
  Skeleton,
  EmptyState,
  ErrorState,
  Button,
} from '../../components/ui';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { AiRecipeModal } from '../../components/ai/AiRecipeModal';
import { useInfiniteRecipes } from '../../hooks/useRecipes';
import { useFavorites, useToggleFavorite } from '../../hooks/useFavorites';
import { Recipe } from '../../types/recipe';

const CATEGORIES = [
  { id: 'all', name: 'All Recipes', emoji: '🍽️' },
  { id: 'breakfast', name: 'Breakfast', emoji: '☀️' },
  { id: 'lunch', name: 'Lunch', emoji: '🍛' },
  { id: 'dinner', name: 'Dinner', emoji: '🍲' },
  { id: 'snack', name: 'Snacks', emoji: '🥪' },
  { id: 'dessert', name: 'Desserts', emoji: '🍰' },
];



const CUISINES = ['All', 'Indian', 'Italian', 'Mexican', 'Chinese', 'Thai', 'British', 'American'];

const TIMES = [
  { label: 'Any time', value: undefined },
  { label: '< 20 mins', value: 20 },
  { label: '< 30 mins', value: 30 },
  { label: '< 45 mins', value: 45 },
  { label: '< 60 mins', value: 60 },
];

const SORTS = [
  { id: 'rating', label: 'Highest Rated', icon: 'star' },
  { id: 'time', label: 'Quickest', icon: 'time-outline' },
  { id: 'title', label: 'Title (A-Z)', icon: 'text-outline' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { isSignedIn } = useUser();
  const searchParams = useLocalSearchParams<{ category?: string; maxTime?: string }>();

  // Applied Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDiet, setSelectedDiet] = useState<'all' | 'veg' | 'non-veg' | 'vegan'>('all');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [selectedMaxTime, setSelectedMaxTime] = useState<number | undefined>(undefined);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [selectedSort, setSelectedSort] = useState<string>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal & Search States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Draft filter states for Bottom Sheet
  const [draftCategory, setDraftCategory] = useState<string>('all');
  const [draftDiet, setDraftDiet] = useState<'all' | 'veg' | 'non-veg' | 'vegan'>('all');
  const [draftCuisine, setDraftCuisine] = useState<string>('All');
  const [draftMaxTime, setDraftMaxTime] = useState<number | undefined>(undefined);
  const [draftDifficulty, setDraftDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [draftSort, setDraftSort] = useState<string>('rating');

  // Favorites
  const { data: favorites } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();

  const favoriteIds = useMemo(() => {
    return new Set(
      (favorites || []).map((f) => f.id || `${f.source}:${f.externalId}`)
    );
  }, [favorites]);

  // Debounce search query (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle route params on mount or change
  useEffect(() => {
    if (searchParams.category) {
      setSelectedCategory(searchParams.category);
    }
    if (searchParams.maxTime) {
      const parsedTime = parseInt(searchParams.maxTime, 10);
      if (!isNaN(parsedTime)) {
        setSelectedMaxTime(parsedTime);
      }
    }
  }, [searchParams.category, searchParams.maxTime]);

  // Query Params for Infinite Query
  const queryParams = useMemo(() => {
    return {
      query: debouncedSearchQuery.trim() || undefined,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      diet: selectedDiet === 'all' ? undefined : selectedDiet,
      cuisine: selectedCuisine === 'All' ? undefined : selectedCuisine,
      maxTime: selectedMaxTime,
      difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
      limit: 12,
    };
  }, [
    debouncedSearchQuery,
    selectedCategory,
    selectedDiet,
    selectedCuisine,
    selectedMaxTime,
    selectedDifficulty,
  ]);

  // Infinite Query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteRecipes(queryParams);

  // Flatten and locally sort all loaded recipes
  const allRecipes = useMemo(() => {
    if (!data?.pages) return [];
    let items = data.pages.flatMap((page) => page.recipes);

    if (selectedSort === 'rating') {
      items = [...items].sort((a, b) => (b.rating?.value || 0) - (a.rating?.value || 0));
    } else if (selectedSort === 'time') {
      items = [...items].sort((a, b) => (a.cookTimeMins || 30) - (b.cookTimeMins || 30));
    } else if (selectedSort === 'title') {
      items = [...items].sort((a, b) => a.title.localeCompare(b.title));
    }

    return items;
  }, [data?.pages, selectedSort]);

  // Filter Count: counts all active criteria
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedDiet !== 'all') count++;
    if (selectedCuisine !== 'All') count++;
    if (selectedMaxTime !== undefined) count++;
    if (selectedDifficulty !== 'all') count++;
    return count;
  }, [selectedCategory, selectedDiet, selectedCuisine, selectedMaxTime, selectedDifficulty]);

  // Open Bottom Sheet with fresh Draft state
  const handleOpenFilterModal = useCallback(() => {
    setDraftCategory(selectedCategory);
    setDraftDiet(selectedDiet);
    setDraftCuisine(selectedCuisine);
    setDraftMaxTime(selectedMaxTime);
    setDraftDifficulty(selectedDifficulty);
    setDraftSort(selectedSort);
    setIsFilterModalOpen(true);
  }, [selectedCategory, selectedDiet, selectedCuisine, selectedMaxTime, selectedDifficulty, selectedSort]);

  // Apply Draft filters from Bottom Sheet
  const handleApplyFilters = useCallback(() => {
    setSelectedCategory(draftCategory);
    setSelectedDiet(draftDiet);
    setSelectedCuisine(draftCuisine);
    setSelectedMaxTime(draftMaxTime);
    setSelectedDifficulty(draftDifficulty);
    setSelectedSort(draftSort);
    setIsFilterModalOpen(false);
  }, [draftCategory, draftDiet, draftCuisine, draftMaxTime, draftDifficulty, draftSort]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSelectedCategory('all');
    setSelectedDiet('all');
    setSelectedCuisine('All');
    setSelectedMaxTime(undefined);
    setSelectedDifficulty('all');
    setSelectedSort('rating');
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  // Reset only modal draft filters
  const resetDraftFilters = useCallback(() => {
    setDraftCategory('all');
    setDraftDiet('all');
    setDraftCuisine('All');
    setDraftMaxTime(undefined);
    setDraftDifficulty('all');
    setDraftSort('rating');
  }, []);

  // Favorite toggle handler
  const handleToggleFavorite = (recipe: {
    id: string;
    title: string;
    image?: string;
    cuisine?: string;
    cookTimeMins?: number;
    servings?: number;
    difficulty?: string;
    isVeg?: boolean;
  }) => {
    if (!isSignedIn) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save recipes to your favorites collection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/sign-in') },
        ]
      );
      return;
    }

    const isCurrentlyFavorited = favoriteIds.has(recipe.id);
    toggleFavoriteMutation.mutate({
      recipeId: recipe.id,
      isCurrentlyFavorited,
      snapshot: {
        title: recipe.title,
        image: recipe.image,
        cuisine: recipe.cuisine,
        isVeg: recipe.isVeg,
        cookTimeMins: recipe.cookTimeMins,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
      },
    });
  };

  // Header Component (Rendered above recipe results in FlatList)
  const renderHeader = () => (
    <View style={styles.headerArea}>
      {/* Category Horizontal Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                  pressed && styles.chipPressed,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Category: ${cat.name}`}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

   

      {/* Active Filters Summary Strip */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersLabel}>Filters:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersScroll}
          >
            {selectedCategory !== 'all' && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                </Text>
                <Pressable
                  onPress={() => setSelectedCategory('all')}
                  hitSlop={8}
                  accessibilityLabel="Remove category filter"
                >
                  <Ionicons name="close-circle" size={15} color="#20563F" />
                </Pressable>
              </View>
            )}

            {selectedDiet !== 'all' && (
              <View style={styles.activeTag}>
              
                <Pressable
                  onPress={() => setSelectedDiet('all')}
                  hitSlop={8}
                  accessibilityLabel="Remove diet filter"
                >
                  <Ionicons name="close-circle" size={15} color="#20563F" />
                </Pressable>
              </View>
            )}

            {selectedCuisine !== 'All' && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>{selectedCuisine}</Text>
                <Pressable
                  onPress={() => setSelectedCuisine('All')}
                  hitSlop={8}
                  accessibilityLabel="Remove cuisine filter"
                >
                  <Ionicons name="close-circle" size={15} color="#20563F" />
                </Pressable>
              </View>
            )}

            {selectedMaxTime !== undefined && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>&lt; {selectedMaxTime} mins</Text>
                <Pressable
                  onPress={() => setSelectedMaxTime(undefined)}
                  hitSlop={8}
                  accessibilityLabel="Remove time filter"
                >
                  <Ionicons name="close-circle" size={15} color="#20563F" />
                </Pressable>
              </View>
            )}

            {selectedDifficulty !== 'all' && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>
                  {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
                </Text>
                <Pressable
                  onPress={() => setSelectedDifficulty('all')}
                  hitSlop={8}
                  accessibilityLabel="Remove difficulty filter"
                >
                  <Ionicons name="close-circle" size={15} color="#20563F" />
                </Pressable>
              </View>
            )}

            <Pressable onPress={resetFilters} style={styles.clearAllBtn} hitSlop={8}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Results Toolbar: Count, Active Sort, and View Toggle */}
      {!isLoading && !isError && (
        <View style={styles.countRow}>
         
          <View style={styles.toolbarRight}>
            {/* Active Sort Indicator */}
            <Pressable
              style={styles.sortIndicatorPill}
              onPress={handleOpenFilterModal}
              accessibilityRole="button"
              accessibilityLabel={`Current sort: ${SORTS.find((s) => s.id === selectedSort)?.label}. Tap to change.`}
            >
              <Ionicons name="swap-vertical" size={13} color="#20563F" />
              <Text style={styles.sortIndicatorText}>
                {SORTS.find((s) => s.id === selectedSort)?.label}
              </Text>
            </Pressable>

            {/* Grid / List Switcher */}
            <View style={styles.viewToggleContainer}>
              <Pressable
                style={[
                  styles.viewToggleBtn,
                  viewMode === 'grid' && styles.viewToggleBtnActive,
                ]}
                onPress={() => setViewMode('grid')}
                accessibilityLabel="Switch to Grid View"
                accessibilityRole="button"
              >
                <Ionicons
                  name="grid"
                  size={15}
                  color={viewMode === 'grid' ? '#FFFFFF' : '#777D76'}
                />
              </Pressable>
              <Pressable
                style={[
                  styles.viewToggleBtn,
                  viewMode === 'list' && styles.viewToggleBtnActive,
                ]}
                onPress={() => setViewMode('list')}
                accessibilityLabel="Switch to List View"
                accessibilityRole="button"
              >
                <Ionicons
                  name="list"
                  size={16}
                  color={viewMode === 'list' ? '#FFFFFF' : '#777D76'}
                />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  // Empty or Loading Component
  const renderEmptyOrLoading = () => {
    if (isLoading) {
      return (
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={styles.skeletonItem}>
              <Skeleton width="100%" height={135} borderRadius={18} style={{ marginBottom: 8 }} />
              <Skeleton width="85%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
              <Skeleton width="55%" height={12} borderRadius={4} />
            </View>
          ))}
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.stateContainer}>
          <ErrorState
            title="Failed to load recipes"
            message={error?.message || 'Please check your internet connection and tap retry.'}
            onRetry={() => refetch()}
          />
        </View>
      );
    }

    return (
      <View style={styles.stateContainer}>
        <EmptyState
          title={
            searchQuery.trim()
              ? `No recipes found for "${searchQuery.trim()}"`
              : 'No recipes match your criteria'
          }
          message={
            searchQuery.trim()
              ? "Can't find this exact dish? Formulate an authentic personalized recipe in seconds with AI!"
              : 'Try clearing some of your filters or switching meal categories.'
          }
          actionTitle={searchQuery.trim() ? 'Generate with AI ✨' : 'Reset All Filters'}
          onActionPress={searchQuery.trim() ? () => setIsAiModalOpen(true) : resetFilters}
        />
        {searchQuery.trim().length > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.aiQuickBtn,
              pressed && styles.aiQuickBtnPressed,
            ]}
            onPress={() => setIsAiModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Generate ${searchQuery.trim()} with AI`}
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            <Text style={styles.aiQuickBtnText}>
              Generate "{searchQuery.trim()}" with AI ✨
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const isWide = windowWidth > 768;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ======================================================== */}
      {/* STICKY TOP HEADER                                        */}
      {/* ======================================================== */}
      <View style={styles.topPinnedHeader}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextContainer}>
            <Text style={styles.pageTitle}>Discover</Text>
            <Text style={styles.pageSubtitle}>Find something delicious today.</Text>
          </View>

          {/* Filter Modal Trigger with Badge */}
          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              activeFiltersCount > 0 && styles.filterButtonActive,
              pressed && styles.filterButtonPressed,
            ]}
            onPress={handleOpenFilterModal}
            accessibilityRole="button"
            accessibilityLabel="Open filters bottom sheet"
          >
            <Ionicons
              name="options-outline"
              size={17}
              color={activeFiltersCount > 0 ? '#FFFFFF' : '#20563F'}
            />
            <Text
              style={[
                styles.filterButtonText,
                activeFiltersCount > 0 && styles.filterButtonTextActive,
              ]}
            >
              Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </Pressable>
        </View>

        {/* Search Input Bar with Clear Action */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter by dish, ingredient or cuisine..."
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* ======================================================== */}
      {/* RECIPE FLATLIST                                          */}
      {/* ======================================================== */}
      <FlatList
        key={viewMode} // Re-mount when switching between 2-col grid and 1-col list
        data={isLoading ? [] : allRecipes}
        keyExtractor={(item: Recipe, index: number) => `${item.id}-${index}`}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyOrLoading}
        contentContainerStyle={[
          styles.listContent,
          isWide && styles.listContentWide,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#20563F']}
            tintColor="#20563F"
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }: { item: Recipe }) => (
          <RecipeCard
            id={item.id}
            title={item.title}
            image={item.image}
            cuisine={item.cuisine}
            cookTimeMins={item.cookTimeMins}
            servings={item.servings}
            difficulty={item.difficulty}
            isVeg={item.dietary?.vegetarian}
            isAiGenerated={item.isAiGenerated}
            rating={item.rating}
            isFavorite={favoriteIds.has(item.id)}
            onToggleFavorite={() =>
              handleToggleFavorite({
                id: item.id,
                title: item.title,
                image: item.image,
                cuisine: item.cuisine,
                cookTimeMins: item.cookTimeMins,
                servings: item.servings,
                difficulty: item.difficulty,
                isVeg: item.dietary?.vegetarian,
              })
            }
            onPress={(id) =>
              router.push({
                pathname: '/recipe/[id]',
                params: { id },
              } as any)
            }
            variant={viewMode === 'grid' ? 'grid' : 'horizontal'}
          />
        )}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#20563F" />
              <Text style={styles.footerLoaderText}>Loading more dishes...</Text>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )
        }
      />

      {/* ======================================================== */}
      {/* FILTER BOTTOM SHEET MODAL                                */}
      {/* ======================================================== */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsFilterModalOpen(false)}
          />

          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            {/* Native Drag Handle Bar */}
            <View style={styles.dragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter Recipes</Text>
                <Text style={styles.modalSubtitle}>
                  Customize your dietary, cuisine & time criteria
                </Text>
              </View>
              <Pressable
                onPress={() => setIsFilterModalOpen(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close filter sheet"
              >
                <Ionicons name="close" size={19} color="#252821" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScroll}
            >
              {/* 1. Meal Category */}
              <Text style={styles.filterSectionTitle}>Meal Category</Text>
              <View style={styles.pillsRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.modalPill,
                      draftCategory === c.id && styles.modalPillActive,
                    ]}
                    onPress={() => setDraftCategory(c.id)}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        draftCategory === c.id && styles.modalPillTextActive,
                      ]}
                    >
                      {c.emoji} {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 2. Diet Preference */}
              <Text style={styles.filterSectionTitle}>Diet Preference</Text>
            
              {/* 3. Cuisine */}
              <Text style={styles.filterSectionTitle}>Cuisine</Text>
              <View style={styles.pillsRow}>
                {CUISINES.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.modalPill,
                      draftCuisine === c && styles.modalPillActive,
                    ]}
                    onPress={() => setDraftCuisine(c)}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        draftCuisine === c && styles.modalPillTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 4. Cooking Time */}
              <Text style={styles.filterSectionTitle}>Max Cook Time</Text>
              <View style={styles.pillsRow}>
                {TIMES.map((t) => (
                  <Pressable
                    key={t.label}
                    style={[
                      styles.modalPill,
                      draftMaxTime === t.value && styles.modalPillActive,
                    ]}
                    onPress={() => setDraftMaxTime(t.value)}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        draftMaxTime === t.value && styles.modalPillTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 5. Difficulty */}
              <Text style={styles.filterSectionTitle}>Difficulty</Text>
              <View style={styles.pillsRow}>
                {['all', 'easy', 'medium', 'hard'].map((diff) => (
                  <Pressable
                    key={diff}
                    style={[
                      styles.modalPill,
                      draftDifficulty === diff && styles.modalPillActive,
                    ]}
                    onPress={() => setDraftDifficulty(diff as any)}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        draftDifficulty === diff && styles.modalPillTextActive,
                      ]}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 6. Sorting */}
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.pillsRow}>
                {SORTS.map((s) => (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.modalPill,
                      draftSort === s.id && styles.modalPillActive,
                    ]}
                    onPress={() => setDraftSort(s.id)}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        draftSort === s.id && styles.modalPillTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Actions with Sticky Clean Spacing */}
            <View style={styles.modalActions}>
              <Button
                title="Reset"
                variant="outline"
                onPress={resetDraftFilters}
                style={{ flex: 1 }}
              />
              <Button
                title="Apply Filters"
                variant="primary"
                onPress={handleApplyFilters}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Recipe Generator Modal */}
      <AiRecipeModal
        visible={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        initialPrompt={searchQuery.trim()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFBF1',
  },
  topPinnedHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: '#FFFBF1',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE1',
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#252821',
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#777D76',
    marginTop: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#20563F',
    borderColor: '#20563F',
  },
  filterButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  filterButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#20563F',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  /* FlatList layout */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  listContentWide: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 12,
  },
  headerArea: {
    marginBottom: 12,
  },

  /* Categories Horizontal Carousel */
  categoryContainer: {
    marginBottom: 10,
  },
  categoryScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#20563F',
    borderColor: '#20563F',
  },
  chipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  categoryEmoji: {
    fontSize: 13,
  },
  categoryChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#252821',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },

  /* Segmented Diet Filter Row */
  dietFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dietChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    gap: 4,
  },
  dietChipActive: {
    backgroundColor: '#EAF5EC',
    borderColor: '#20563F',
  },
  dietChipEmoji: {
    fontSize: 11.5,
  },
  dietChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#777D76',
  },
  dietChipTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#20563F',
  },

  /* Active Filters Strip */
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
    gap: 8,
  },
  activeFiltersLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#777D76',
  },
  activeFiltersScroll: {
    gap: 6,
    alignItems: 'center',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5EC',
    borderWidth: 1,
    borderColor: '#C6E3CD',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 5,
  },
  activeTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#20563F',
  },
  clearAllBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  clearAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#D94B45',
  },

  /* Results Toolbar */
  countRow: {
      flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingBottom: 2,
  },
  countText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#252821',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sortIndicatorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#20563F',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E5DC',
    padding: 2,
    gap: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: '#20563F',
  },

  /* Loading Skeletons & States */
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  skeletonItem: {
    width: '48%',
    marginBottom: 14,
  },
  stateContainer: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  aiQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 20,
    marginTop: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  aiQuickBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  aiQuickBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#777D76',
  },

  /* Filter Bottom Sheet Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#D9DED9',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#252821',
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#777D76',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingBottom: 16,
  },
  filterSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#252821',
    marginTop: 14,
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F5F2EB',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalPillActive: {
    backgroundColor: '#EAF5EC',
    borderColor: '#20563F',
  },
  modalPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#252821',
  },
  modalPillTextActive: {
    color: '#20563F',
    fontFamily: 'Inter_600SemiBold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
});
