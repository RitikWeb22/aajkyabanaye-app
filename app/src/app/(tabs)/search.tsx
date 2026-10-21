import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { SearchBar } from '../../components/ui/SearchBar';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { AiRecipeModal } from '../../components/ai/AiRecipeModal';
import { useAppStore } from '../../store/useAppStore';
import {
  useSmartSearch,
  useSearchSuggestions,
  usePopularSearches,
} from '../../hooks/useRecipes';
import { Recipe } from '../../types/recipe';

interface PantryCategory {
  title: string;
  emoji: string;
  items: string[];
}

const PANTRY_CATEGORIES: PantryCategory[] = [
  {
    title: 'Vegetables & Aromatics',
    emoji: '🍅',
    items: [
      'Potato',
      'Onion',
      'Tomato',
      'Garlic',
      'Ginger',
      'Green Chilli',
      'Capsicum',
      'Spinach',
      'Cauliflower',
      'Green Peas',
      'Carrot',
    ],
  },
  {
    title: 'Proteins & Dairy',
    emoji: '🧀',
    items: [
      'Paneer',
      'Curd / Dahi',
      'Egg',
      'Chicken',
      'Toor Dal',
      'Moong Dal',
      'Chole / Chickpeas',
      'Rajma / Kidney Beans',
      'Tofu',
      'Cheese',
    ],
  },
  {
    title: 'Grains & Staples',
    emoji: '🍚',
    items: [
      'Basmati Rice',
      'Atta / Wheat Flour',
      'Maida',
      'Besan / Gram Flour',
      'Oats',
      'Pasta',
      'Bread',
      'Poha / Flattened Rice',
    ],
  },
  {
    title: 'Herbs & Seasoning',
    emoji: '🌿',
    items: [
      'Fresh Coriander',
      'Mint / Pudina',
      'Curry Leaves',
      'Kasuri Methi',
      'Cumin / Jeera',
      'Mustard Seeds',
      'Garam Masala',
    ],
  },
];

type SearchTab = 'pantry' | 'popular';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Search input state
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('pantry');
  const [selectedPantry, setSelectedPantry] = useState<string[]>(['Potato', 'Onion']);
  const [isSearchingWithPantry, setIsSearchingWithPantry] = useState(false);

  // AI Recipe Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalPrompt, setAiModalPrompt] = useState('');
  const [aiModalIngredients, setAiModalIngredients] = useState<string[]>([]);

  const handleOpenAiModal = (promptText?: string, ings?: string[]) => {
    setAiModalPrompt(promptText !== undefined ? promptText : query);
    setAiModalIngredients(ings !== undefined ? ings : selectedPantry);
    setIsAiModalOpen(true);
  };

  // Zustand Store
  const recentSearches = useAppStore((s) => s.recentSearches);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);

  // Suggestions Hook
  const { data: suggestions } = useSearchSuggestions(query);

  // Popular Searches Hook
  const { data: popularSearches, isLoading: isLoadingPopular } = usePopularSearches();

  // Active Search Query execution
  const searchParams = useMemo(() => {
    if (isSearchingWithPantry && selectedPantry.length > 0) {
      return {
        q: query.trim() || undefined,
        ingredients: selectedPantry.join(','),
        limit: 16,
      };
    }
    return {
      q: activeQuery.trim() || undefined,
      limit: 16,
    };
  }, [activeQuery, isSearchingWithPantry, selectedPantry, query]);

  const isExecutingSearch = Boolean(
    activeQuery || (isSearchingWithPantry && selectedPantry.length > 0)
  );

  // Smart Search Hook
  const {
    data: searchResponse,
    isLoading: isSearchLoading,
    isError: isSearchError,
    refetch: refetchSearch,
  } = useSmartSearch(searchParams, isExecutingSearch);

  const searchResults = searchResponse?.data || [];
  const parsedIntent = searchResponse?.parsedIntent;
  const suggestAi = searchResponse?.suggestAi ?? false;

  const togglePantry = (item: string) => {
    setSelectedPantry((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const removePantryItem = (item: string) => {
    setSelectedPantry((prev) => prev.filter((i) => i !== item));
  };

  const handleSearchSubmit = (searchTerm?: string) => {
    const term = (searchTerm || query).trim();
    if (term) {
      setIsSearchingWithPantry(false);
      setActiveQuery(term);
      setQuery(term);
      addRecentSearch(term);
    }
  };

  const handlePantrySearchSubmit = () => {
    if (selectedPantry.length > 0) {
      setIsSearchingWithPantry(true);
      setActiveQuery('');
      addRecentSearch(
        `With ${selectedPantry.slice(0, 3).join(', ')}${
          selectedPantry.length > 3 ? '...' : ''
        }`
      );
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setActiveQuery('');
    setIsSearchingWithPantry(false);
  };

  // -------------------------------------------------------------
  // Mode 1: Search Results View
  // -------------------------------------------------------------
  if (isExecutingSearch) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Sticky Search Header */}
        <View style={styles.resultsHeader}>
          <View style={styles.searchBarRow}>
            <View style={{ flex: 1 }}>
              <SearchBar
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  if (!text.trim()) {
                    handleClearSearch();
                  }
                }}
                placeholder="Search dishes or ingredients..."
                onSubmitEditing={() => handleSearchSubmit()}
                autoFocus={false}
              />
            </View>
            <Pressable
              style={styles.clearSearchBtn}
              onPress={handleClearSearch}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search results"
            >
              <Text style={styles.clearSearchBtnText}>Clear</Text>
            </Pressable>
          </View>

          {/* Parsed Search Intent Chips */}
          {parsedIntent && (
            <View style={styles.intentChipsRow}>
              <View style={styles.intentChip}>
                <Ionicons name="sparkles" size={12} color={Colors.primary.DEFAULT} />
                <Text style={styles.intentChipText} numberOfLines={1}>
                  {parsedIntent.isIngredientSearch
                    ? `Pantry: ${parsedIntent.ingredients.join(', ')}`
                    : parsedIntent.cleanedQuery}
                </Text>
              </View>

              {parsedIntent.diet && (
                <View style={[styles.intentChip, { backgroundColor: '#EAF5EC' }]}>
                  <Text style={styles.intentChipText}>
                    {parsedIntent.diet === 'veg' ? 'Pure Veg 🟢' : 'Non-Veg 🔴'}
                  </Text>
                </View>
              )}

              {parsedIntent.maxTime && (
                <View style={styles.intentChip}>
                  <Ionicons name="time-outline" size={12} color={Colors.primary.DEFAULT} />
                  <Text style={styles.intentChipText}>&lt; {parsedIntent.maxTime}m</Text>
                </View>
              )}

              {parsedIntent.exclusions.length > 0 && (
                <View style={[styles.intentChip, { backgroundColor: '#FBEBEB' }]}>
                  <Text style={[styles.intentChipText, { color: Colors.error.DEFAULT }]}>
                    No {parsedIntent.exclusions.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {isSearchLoading ? (
          <View style={styles.loadingWrapper}>
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map((key) => (
                <View
                  key={key}
                  style={[
                    styles.skeletonCard,
                    { width: (screenWidth - 44) / 2 },
                  ]}
                >
                  <Skeleton width="100%" height={140} borderRadius={18} style={{ marginBottom: 10 }} />
                  <Skeleton width="85%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
                  <Skeleton width="55%" height={12} borderRadius={4} />
                </View>
              ))}
            </View>
          </View>
        ) : isSearchError ? (
          <ErrorState
            title="Search failed"
            message="Please check your connection and tap below to retry."
            onRetry={() => refetchSearch()}
          />
        ) : searchResults.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <EmptyState
              title="No recipe matches found"
              message="We couldn't find database recipes matching your exact criteria."
              iconName="search-outline"
            />

            {/* AI Custom Recipe Generator Offer */}
            <View style={styles.aiHeroCard}>
              <View style={styles.aiHeroPill}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                <Text style={styles.aiHeroPillText}>AI RECIPE GENERATOR</Text>
              </View>
              <Text style={styles.aiHeroTitle}>Create an AI Custom Recipe</Text>
              <Text style={styles.aiHeroSubtitle}>
                AajKyaBanaye AI can formulate an authentic, tailored dish using your exact preferences and ingredients (
                {selectedPantry.slice(0, 3).join(', ')}
                {selectedPantry.length > 3 ? '...' : ''}).
              </Text>
              <Button
                title="Generate With AI ✨"
                onPress={() =>
                  handleOpenAiModal(query || selectedPantry.join(', '), selectedPantry)
                }
                variant="primary"
                size="md"
                style={{ backgroundColor: '#1E5038', marginTop: 12, alignSelf: 'flex-start' }}
              />
            </View>
          </ScrollView>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item: Recipe) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.resultsColumnWrapper}
            contentContainerStyle={styles.resultsListContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.resultsMetaHeader}>
                <Text style={styles.resultsCountLabel}>
                  Found {searchResults.length} matching {searchResults.length === 1 ? 'recipe' : 'recipes'}
                </Text>

                {/* Inline AI Suggestion Banner */}
                {suggestAi && (
                  <View style={styles.aiInlineBanner}>
                    <View style={styles.aiInlineTopRow}>
                      <View style={styles.aiInlineIconCircle}>
                        <Ionicons name="sparkles" size={14} color="#8A4A1C" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.aiInlineTitle}>Want a bespoke recipe?</Text>
                        <Text style={styles.aiInlineSubtitle}>
                          Let AajKyaBanaye AI tailor an original dish strictly to your kitchen.
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.aiInlineActionBtn}
                      onPress={() =>
                        handleOpenAiModal(query || selectedPantry.join(', '), selectedPantry)
                      }
                      accessibilityRole="button"
                    >
                      <Text style={styles.aiInlineActionText}>Generate with AI →</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <RecipeCard
                id={item.id}
                title={item.title}
                image={item.image}
                cuisine={item.cuisine}
                cookTimeMins={item.cookTimeMins}
                servings={item.servings}
                difficulty={item.difficulty}
                isVeg={item.dietary.vegetarian}
                isAiGenerated={item.isAiGenerated}
                rating={item.rating}
                onPress={(id) =>
                  router.push({
                    pathname: '/recipe/[id]',
                    params: { id },
                  } as any)
                }
                variant="grid"
              />
            )}
            ListFooterComponent={<View style={{ height: 32 }} />}
          />
        )}

        {/* AI Recipe Generator Modal */}
        <AiRecipeModal
          visible={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          initialPrompt={aiModalPrompt}
          initialIngredients={aiModalIngredients}
        />
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // Mode 2: Discovery & Pantry Ingredient Picker View
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 2. Search Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Find your next meal</Text>
        <Text style={styles.screenSubtitle}>
          Search dishes, conversational cravings, or cook with what you own
        </Text>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Try 'Paneer butter masala' or 'Quick snacks'..."
          onSubmitEditing={() => handleSearchSubmit()}
          style={{ marginTop: 12 }}
        />

        {/* Autocomplete Suggestions Dropdown */}
        {suggestions && suggestions.length > 0 && query.trim().length >= 2 && (
          <View style={styles.suggestionsDropdown}>
            {suggestions.map((item, idx) => (
              <Pressable
                key={idx}
                style={styles.suggestionItem}
                onPress={() => handleSearchSubmit(item)}
                accessibilityRole="button"
                accessibilityLabel={`Search suggestion: ${item}`}
              >
                <Ionicons name="search-outline" size={15} color={Colors.primary.DEFAULT} />
                <Text style={styles.suggestionText}>{item}</Text>
                <Ionicons name="arrow-forward" size={13} color={Colors.text.muted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* 4. Navigation Segmented Control Tabs */}
        <View style={styles.segmentedControl}>
          <Pressable
            style={[
              styles.segmentTab,
              activeTab === 'pantry' && styles.segmentTabActive,
            ]}
            onPress={() => setActiveTab('pantry')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'pantry' }}
          >
            <Ionicons
              name="basket-outline"
              size={15}
              color={activeTab === 'pantry' ? '#FFFFFF' : Colors.text.DEFAULT}
            />
            <Text
              style={[
                styles.segmentTabText,
                activeTab === 'pantry' && styles.segmentTabTextActive,
              ]}
            >
              Cook With Fridge
            </Text>
            {selectedPantry.length > 0 && (
              <View
                style={[
                  styles.tabCounterBadge,
                  activeTab === 'pantry' && styles.tabCounterBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabCounterText,
                    activeTab === 'pantry' && styles.tabCounterTextActive,
                  ]}
                >
                  {selectedPantry.length}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.segmentTab,
              activeTab === 'popular' && styles.segmentTabActive,
            ]}
            onPress={() => setActiveTab('popular')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'popular' }}
          >
            <Ionicons
              name="flame-outline"
              size={15}
              color={activeTab === 'popular' ? '#FFFFFF' : Colors.text.DEFAULT}
            />
            <Text
              style={[
                styles.segmentTabText,
                activeTab === 'popular' && styles.segmentTabTextActive,
              ]}
            >
              Popular Searches
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Body Content */}
      <ScrollView
        contentContainerStyle={[
          styles.mainScrollContent,
          activeTab === 'pantry' && { paddingBottom: 110 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'pantry' ? (
          /* ===================== 3. INGREDIENT SELECTION ===================== */
          <View style={styles.pantryContainer}>
            <View style={styles.pantryHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.pantrySectionTitle}>
                  Select Your Available Ingredients
                </Text>
                <Text style={styles.pantrySectionSubtitle}>
                  We'll rank recipes by matching ingredient overlap
                </Text>
              </View>
              {selectedPantry.length > 0 && (
                <Pressable
                  onPress={() => setSelectedPantry([])}
                  hitSlop={8}
                  style={styles.clearAllBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all selected ingredients"
                >
                  <Text style={styles.clearAllBtnText}>Clear all</Text>
                </Pressable>
              )}
            </View>

            {/* Selected Ingredients Summary Strip */}
            {selectedPantry.length > 0 && (
              <View style={styles.selectedSummaryBlock}>
                <View style={styles.selectedSummaryHeader}>
                  <Ionicons name="checkmark-done" size={14} color={Colors.primary.DEFAULT} />
                  <Text style={styles.selectedSummaryTitle}>
                    Selected ({selectedPantry.length}):
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedSummaryScroll}
                >
                  {selectedPantry.map((item) => (
                    <Pressable
                      key={item}
                      style={styles.summaryTag}
                      onPress={() => removePantryItem(item)}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item}`}
                    >
                      <Text style={styles.summaryTagText}>{item}</Text>
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Ingredient Categories */}
            {PANTRY_CATEGORIES.map((cat, cIdx) => (
              <View key={cIdx} style={styles.pantryCategorySection}>
                <View style={styles.categoryTitleRow}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  <Text style={styles.categoryCount}>({cat.items.length})</Text>
                </View>

                <View style={styles.chipsWrapContainer}>
                  {cat.items.map((item) => {
                    const isSelected = selectedPantry.includes(item);
                    return (
                      <Pressable
                        key={item}
                        onPress={() => togglePantry(item)}
                        style={({ pressed }) => [
                          styles.ingredientChip,
                          isSelected && styles.ingredientChipActive,
                          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${item}, ${isSelected ? 'selected' : 'not selected'}`}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark' : 'add'}
                          size={14}
                          color={isSelected ? '#FFFFFF' : Colors.primary.DEFAULT}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.ingredientChipText,
                            isSelected && styles.ingredientChipTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* ===================== 8. POPULAR & RECENT SEARCHES ===================== */
          <View style={styles.popularSectionContainer}>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.recentSearchesCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={16} color={Colors.primary.DEFAULT} />
                    <Text style={styles.sectionCardTitle}>Recent Searches</Text>
                  </View>
                  <Pressable
                    onPress={clearRecentSearches}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Clear recent searches"
                  >
                    <Text style={styles.clearHistoryText}>Clear history</Text>
                  </Pressable>
                </View>

                <View style={styles.recentChipsCloud}>
                  {recentSearches.map((search, idx) => (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [
                        styles.recentSearchChip,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => handleSearchSubmit(search)}
                      accessibilityRole="button"
                    >
                      <Ionicons name="time-outline" size={12} color={Colors.text.muted} />
                      <Text style={styles.recentSearchChipText} numberOfLines={1}>
                        {search}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Searches */}
            <View style={styles.popularSearchesCard}>
              <View style={styles.popularCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="flame" size={17} color={Colors.accent.DEFAULT} />
                  <Text style={styles.sectionCardTitle}>Trending & Popular Dishes</Text>
                </View>
                <Text style={styles.sectionCardSubtitle}>
                  Tap any dish to search database instantly
                </Text>
              </View>

              {isLoadingPopular ? (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Skeleton width="100%" height={44} borderRadius={14} />
                  <Skeleton width="100%" height={44} borderRadius={14} />
                  <Skeleton width="100%" height={44} borderRadius={14} />
                </View>
              ) : (
                <View style={styles.popularRowsWrapper}>
                  {(popularSearches || []).map((item, idx) => (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [
                        styles.popularRowItem,
                        idx === 0 && { borderTopWidth: 0 },
                        pressed && { backgroundColor: '#F8F5EE' },
                      ]}
                      onPress={() => handleSearchSubmit(item.query)}
                      accessibilityRole="button"
                      accessibilityLabel={`Popular search: ${item.query}`}
                    >
                      <View style={styles.popularRowLeft}>
                        <View style={styles.popularIndexBadge}>
                          <Text style={styles.popularIndexText}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.popularRowTitle}>{item.query}</Text>
                          {item.category && (
                            <Text style={styles.popularRowCategory}>{item.category}</Text>
                          )}
                        </View>
                      </View>
                      <Ionicons
                        name="trending-up-outline"
                        size={16}
                        color={Colors.accent.DEFAULT}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 5. Sticky Bottom Action Bar for Pantry Search */}
      {activeTab === 'pantry' && (
        <View
          style={[
            styles.stickyBottomBar,
            { paddingBottom: Math.max(12, insets.bottom) },
          ]}
        >
          <View style={styles.bottomBarActionsRow}>
            <View style={{ flex: 1.3 }}>
              <Button
                title={
                  selectedPantry.length > 0
                    ? `Find Recipes (${selectedPantry.length})`
                    : 'Select Ingredients'
                }
                onPress={handlePantrySearchSubmit}
                disabled={selectedPantry.length === 0}
                variant="primary"
                size="md"
                fullWidth
                icon={<Ionicons name="search" size={16} color="#FFFFFF" />}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Button
                title="AI Chef ✨"
                onPress={() => handleOpenAiModal('', selectedPantry)}
                variant="secondary"
                size="md"
                fullWidth
                style={{ backgroundColor: Colors.accent.DEFAULT }}
                textStyle={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}
                icon={<Ionicons name="sparkles" size={15} color="#FFFFFF" />}
              />
            </View>
          </View>
        </View>
      )}

      {/* AI Recipe Generator Modal */}
      <AiRecipeModal
        visible={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        initialPrompt={aiModalPrompt}
        initialIngredients={aiModalIngredients}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0', // Warm off-white
  },

  /* Header Section */
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFF9F0',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DE',
  },
  screenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: Colors.text.DEFAULT,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: Colors.text.muted,
    marginTop: 2,
    lineHeight: 17,
  },
  suggestionsDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E4DA',
    marginTop: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2EA',
  },
  suggestionText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.text.DEFAULT,
  },

  /* 4. Segmented Control Tabs */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3EFE6',
    borderRadius: 14,
    padding: 3,
    marginTop: 12,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: Colors.primary.DEFAULT,
    shadowColor: Colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },
  segmentTabTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  tabCounterBadge: {
    backgroundColor: '#E2DCD0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCounterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCounterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.text.DEFAULT,
  },
  tabCounterTextActive: {
    color: '#FFFFFF',
  },

  /* Results Mode Header */
  resultsHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFF9F0',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DE',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearSearchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearSearchBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.error.DEFAULT,
  },
  intentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  intentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5EC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  intentChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primary.DEFAULT,
  },

  /* Main Scroll Content */
  mainScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },

  /* 3. Pantry Section */
  pantryContainer: {
    paddingBottom: 20,
  },
  pantryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pantrySectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.text.DEFAULT,
  },
  pantrySectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 1,
  },
  clearAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearAllBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.error.DEFAULT,
  },

  /* Selected Summary Strip */
  selectedSummaryBlock: {
    backgroundColor: '#F5F2EA',
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E3D8',
  },
  selectedSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  selectedSummaryTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: Colors.primary.DEFAULT,
  },
  selectedSummaryScroll: {
    gap: 6,
  },
  summaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  summaryTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  /* Pantry Category Block */
  pantryCategorySection: {
    marginBottom: 18,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: Colors.text.DEFAULT,
  },
  categoryCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: Colors.text.muted,
  },
  chipsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  ingredientChipActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
    shadowColor: Colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  ingredientChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: Colors.text.DEFAULT,
  },
  ingredientChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },

  /* 8. Popular & Recent Section */
  popularSectionContainer: {
    paddingBottom: 24,
  },
  recentSearchesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDE7DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    color: Colors.text.DEFAULT,
  },
  sectionCardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: Colors.text.muted,
    marginTop: 2,
  },
  clearHistoryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: Colors.error.DEFAULT,
  },
  recentChipsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  recentSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8F6F0',
    borderWidth: 1,
    borderColor: '#EAE4D8',
    gap: 5,
  },
  recentSearchChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },

  popularSearchesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDE7DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  popularCardHeader: {
    marginBottom: 12,
  },
  popularRowsWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0ECE1',
  },
  popularRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F2EB',
    backgroundColor: '#FFFFFF',
  },
  popularRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  popularIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F2EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularIndexText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: Colors.text.muted,
  },
  popularRowTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: Colors.text.DEFAULT,
  },
  popularRowCategory: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.primary.DEFAULT,
    marginTop: 1,
  },

  /* 5. Sticky Bottom Action Bar */
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECE7DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBarActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  /* 6. Results Mode */
  resultsListContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  resultsColumnWrapper: {
    justifyContent: 'space-between',
    gap: 12,
  },
  resultsMetaHeader: {
    marginBottom: 12,
  },
  resultsCountLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: Colors.text.DEFAULT,
  },
  aiInlineBanner: {
    backgroundColor: '#FAF4EB',
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EBD9BF',
  },
  aiInlineTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  aiInlineIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF2DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInlineTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#8A4A1C',
  },
  aiInlineSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#5C4A3A',
    lineHeight: 16,
    marginTop: 1,
  },
  aiInlineActionBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  aiInlineActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary.DEFAULT,
  },

  /* Empty Search State Hero */
  emptyScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
  },
  aiHeroCard: {
    backgroundColor: '#1E5038',
    borderRadius: 22,
    padding: 20,
    marginTop: 18,
    shadowColor: '#1E5038',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  aiHeroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent.DEFAULT,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
    gap: 4,
  },
  aiHeroPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  aiHeroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  aiHeroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 18,
  },

  /* Loading State */
  loadingWrapper: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  skeletonCard: {
    marginBottom: 16,
  },
});
