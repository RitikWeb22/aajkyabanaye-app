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
  { id: 'all', name: 'All Recipes', emoji: '✨' },
  { id: 'breakfast', name: 'Breakfast', emoji: '☀️' },
  { id: 'lunch', name: 'Lunch', emoji: '🍛' },
  { id: 'dinner', name: 'Dinner', emoji: '🍲' },
  { id: 'snack', name: 'Snacks', emoji: '🥪' },
  { id: 'dessert', name: 'Desserts', emoji: '🍰' },
  { id: 'healthy', name: 'Healthy', emoji: '🥗' },
];

const DIETS: { id: 'all' | 'veg' | 'non-veg' | 'vegan'; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'veg', label: 'Pure Veg', emoji: '🌱' },
  { id: 'non-veg', label: 'Non-Veg', emoji: '🍗' },
  { id: 'vegan', label: 'Vegan', emoji: '🥑' },
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
  const [showAiBanner, setShowAiBanner] = useState<boolean>(true);

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
      {/* 1. AI Inspiration Spotlight Banner */}
      {showAiBanner && !debouncedSearchQuery && (
        <View style={styles.aiSpotlightCard}>
          <View style={styles.aiSpotlightContent}>
            <View style={styles.aiSpotlightBadge}>
              <Ionicons name="sparkles" size={12} color="#FBBF24" />
              <Text style={styles.aiSpotlightBadgeText}>AI CHEF SPOTLIGHT</Text>
            </View>
            <Text style={styles.aiSpotlightTitle}>Can't decide what to cook?</Text>
            <Text style={styles.aiSpotlightSubtitle}>
              Tell us your cravings or fridge ingredients. Get a custom restaurant recipe in 5s!
            </Text>
            <View style={styles.aiSpotlightActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.aiCreateBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setIsAiModalOpen(true)}
              >
                <Ionicons name="flash" size={14} color="#1C4D38" />
                <Text style={styles.aiCreateBtnText}>Create with AI</Text>
              </Pressable>
              <Pressable
                style={styles.aiDismissBtn}
                onPress={() => setShowAiBanner(false)}
                hitSlop={8}
              >
                <Text style={styles.aiDismissBtnText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.aiSpotlightIconWrapper}>
            <Ionicons name="restaurant" size={38} color="rgba(255,255,255,0.18)" />
          </View>
        </View>
      )}

      {/* 2. Quick Diet Segmented Bar */}
      <View style={styles.dietBarContainer}>
        {DIETS.map((diet) => {
          const isSelected = selectedDiet === diet.id;
          return (
            <Pressable
              key={diet.id}
              style={[
                styles.dietPill,
                isSelected && styles.dietPillActive,
              ]}
              onPress={() => setSelectedDiet(diet.id)}
            >
              <Text style={styles.dietEmoji}>{diet.emoji}</Text>
              <Text
                style={[
                  styles.dietPillText,
                  isSelected && styles.dietPillTextActive,
                ]}
              >
                {diet.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3. Category Horizontal Pills */}
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

      {/* 4. Active Filters Summary Strip */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersLabel}>Active Filters:</Text>
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
                  <Ionicons name="close-circle" size={15} color="#1C4D38" />
                </Pressable>
              </View>
            )}

            {selectedDiet !== 'all' && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>
                  {DIETS.find((d) => d.id === selectedDiet)?.label || selectedDiet}
                </Text>
                <Pressable
                  onPress={() => setSelectedDiet('all')}
                  hitSlop={8}
                  accessibilityLabel="Remove diet filter"
                >
                  <Ionicons name="close-circle" size={15} color="#1C4D38" />
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
                  <Ionicons name="close-circle" size={15} color="#1C4D38" />
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
                  <Ionicons name="close-circle" size={15} color="#1C4D38" />
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
                  <Ionicons name="close-circle" size={15} color="#1C4D38" />
                </Pressable>
              </View>
            )}

            <Pressable onPress={resetFilters} style={styles.clearAllBtn} hitSlop={8}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* 5. Results Toolbar: Count, Sort Pill, and View Switcher */}
      {!isLoading && !isError && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {allRecipes.length} {allRecipes.length === 1 ? 'Dish' : 'Dishes'} Available
          </Text>

          <View style={styles.toolbarRight}>
            {/* Active Sort Indicator */}
            <Pressable
              style={styles.sortIndicatorPill}
              onPress={handleOpenFilterModal}
              accessibilityRole="button"
              accessibilityLabel={`Current sort: ${SORTS.find((s) => s.id === selectedSort)?.label}. Tap to change.`}
            >
              <Ionicons name="swap-vertical" size={13} color="#1C4D38" />
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
                  color={viewMode === 'grid' ? '#FFFFFF' : '#8E95A2'}
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
                  color={viewMode === 'list' ? '#FFFFFF' : '#8E95A2'}
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
              <Skeleton width="100%" height={145} borderRadius={18} style={{ marginBottom: 10 }} />
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
            <View style={styles.brandRow}>
              <Text style={styles.pageTitle}>Discover Recipes</Text>
              <View style={styles.recipeCountTag}>
                <Text style={styles.recipeCountTagText}>Curated 🌟</Text>
              </View>
            </View>
            <Text style={styles.pageSubtitle}>Explore dishes, cuisines & chef creations</Text>
          </View>

          {/* Action Row: AI Trigger & Filter Modal Trigger */}
          <View style={styles.headerButtonsRow}>
            <Pressable
              style={styles.aiHeaderIconBtn}
              onPress={() => setIsAiModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open AI recipe assistant"
            >
              <Ionicons name="sparkles" size={17} color="#D97706" />
            </Pressable>

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
                size={16}
                color={activeFiltersCount > 0 ? '#FFFFFF' : '#1C4D38'}
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
        </View>

        {/* Search Input Bar with Clear Action */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by dish, ingredient or cuisine..."
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
          { paddingBottom: 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#1C4D38']}
            tintColor="#1C4D38"
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
              <ActivityIndicator size="small" color="#1C4D38" />
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
                  Customize dietary, cuisine & cooking time
                </Text>
              </View>
              <Pressable
                onPress={() => setIsFilterModalOpen(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close filter sheet"
              >
                <Ionicons name="close" size={19} color="#1E293B" />
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

              {/* 2. Diet Preference (Fixed & Complete) */}
              <Text style={styles.filterSectionTitle}>Dietary Preference</Text>
              <View style={styles.pillsRow}>
                {DIETS.map((d) => (
                  <Pressable
                    key={d.id}
                    style={[
                      styles.modalPill,
                      draftDiet === d.id && styles.modalPillActive,
                    ]}
                    onPress={() => setDraftDiet(d.id)}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        draftDiet === d.id && styles.modalPillTextActive,
                      ]}
                    >
                      {d.emoji} {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

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
                title="Reset All"
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
    backgroundColor: '#F8FAFC',
  },
  topPinnedHeader: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
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
    paddingRight: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  recipeCountTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  recipeCountTagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#B45309',
  },
  pageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiHeaderIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: {
    backgroundColor: '#1C4D38',
    borderColor: '#1C4D38',
  },
  filterButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  filterButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#1C4D38',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  /* FlatList layout */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    marginBottom: 8,
  },

  /* AI Spotlight Card */
  aiSpotlightCard: {
    backgroundColor: '#1C4D38',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#1C4D38',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  aiSpotlightContent: {
    flex: 1,
    paddingRight: 10,
  },
  aiSpotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  aiSpotlightBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  aiSpotlightTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  aiSpotlightSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 16,
    marginBottom: 12,
  },
  aiSpotlightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  aiCreateBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#1C4D38',
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  aiDismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  aiDismissBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  aiSpotlightIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 4,
  },

  /* Segmented Diet Bar */
  dietBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dietPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  dietPillActive: {
    backgroundColor: '#1C4D38',
  },
  dietEmoji: {
    fontSize: 12,
  },
  dietPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#64748B',
  },
  dietPillTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
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
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#1C4D38',
    borderColor: '#1C4D38',
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
    color: '#334155',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },

  /* Active Filters Strip */
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  activeFiltersLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#64748B',
  },
  activeFiltersScroll: {
    gap: 6,
    alignItems: 'center',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF6F0',
    borderWidth: 1,
    borderColor: '#C6E3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  activeTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#1C4D38',
  },
  clearAllBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  clearAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#DC2626',
  },

  /* Results Toolbar */
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  countText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#334155',
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
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    gap: 4,
  },
  sortIndicatorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#1C4D38',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
    gap: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: '#1C4D38',
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
    color: '#64748B',
  },

  /* Filter Bottom Sheet Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
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
    backgroundColor: '#CBD5E1',
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
    color: '#0F172A',
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingBottom: 16,
  },
  filterSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#0F172A',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalPillActive: {
    backgroundColor: '#EBF6F0',
    borderColor: '#1C4D38',
  },
  modalPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#334155',
  },
  modalPillTextActive: {
    color: '#1C4D38',
    fontFamily: 'Inter_600SemiBold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
});
