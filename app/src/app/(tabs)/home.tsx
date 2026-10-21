import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { Colors } from '../../constants/theme';
import {
  Skeleton,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { FeaturedRecipeCard } from '../../components/recipe/FeaturedRecipeCard';
import { AiRecipeModal } from '../../components/ai/AiRecipeModal';
import {
  useRecipes,
  useBanners,
  useRecentlyViewed,
  useClearRecentlyViewed,
} from '../../hooks/useRecipes';
import { useFavorites, useToggleFavorite } from '../../hooks/useFavorites';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAppStore } from '../../store/useAppStore';
import { Recipe } from '../../types/recipe';

interface CategoryItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  bgColor: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'breakfast',
    name: 'Breakfast',
    icon: <Ionicons name="sunny-outline" size={22} color="#D97706" />,
    bgColor: '#FEF3C7',
  },
  {
    id: 'lunch',
    name: 'Lunch',
    icon: <MaterialCommunityIcons name="bowl-mix-outline" size={22} color="#20563F" />,
    bgColor: '#EAF5EC',
  },
  {
    id: 'dinner',
    name: 'Dinner',
    icon: <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#20563F" />,
    bgColor: '#EAF5EC',
  },
  {
    id: 'snack',
    name: 'Snacks',
    icon: <Ionicons name="cafe-outline" size={22} color="#059669" />,
    bgColor: '#ECFDF5',
  },
  {
    id: 'dessert',
    name: 'Desserts',
    icon: <MaterialCommunityIcons name="cupcake" size={22} color="#E11D48" />,
    bgColor: '#FFE4E6',
  },
  {
    id: 'drinks',
    name: 'Drinks',
    icon: <Ionicons name="wine-outline" size={22} color="#2563EB" />,
    bgColor: '#EFF6FF',
  },
];

type DietFilter = 'all' | 'veg' | 'non-veg' | 'vegan';

interface DietOption {
  id: DietFilter;
  label: string;
  icon: string;
}

const DIET_OPTIONS: DietOption[] = [
  { id: 'all', label: 'All Dishes', icon: '🍽️' },
  { id: 'veg', label: 'Pure Veg', icon: '🟢' },
  { id: 'non-veg', label: 'Non-Veg', icon: '🔴' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
];

function getTimeGreeting(): { text: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good Morning' };
  if (hour >= 12 && hour < 17) return { text: 'Good Afternoon' };
  if (hour >= 17 && hour < 22) return { text: 'Good Evening' };
  return { text: 'Good Night' };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { user, isLoaded, isSignedIn } = useUser();

  const [selectedDiet, setSelectedDiet] = useState<DietFilter>('all');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Queries
  const dietParam = selectedDiet === 'all' ? undefined : selectedDiet;

  // 1. Trending / Today's Recommended Recipes
  const {
    data: trendingData,
    isLoading: isLoadingTrending,
    isError: isTrendingError,
    refetch: refetchTrending,
  } = useRecipes({
    query: selectedDiet === 'veg' ? 'paneer' : selectedDiet === 'vegan' ? 'salad' : 'curry',
    diet: dietParam,
    limit: 8,
  });

  // 2. Quick & Easy (< 30 mins)
  const {
    data: quickData,
    isLoading: isLoadingQuick,
    isError: isQuickError,
    refetch: refetchQuick,
  } = useRecipes({
    maxTime: 30,
    diet: dietParam,
    limit: 6,
  });

  // 3. User Favorites
  const { data: favorites } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();

  // 4. Recently viewed
  const { data: recentlyViewed, isLoading: isLoadingRecent } = useRecentlyViewed(
    Boolean(isLoaded && isSignedIn)
  );
  const clearRecentMutation = useClearRecentlyViewed();

  // 5. User Profile & Avatar
  const { data: userProfile } = useUserProfile();
  const storedAvatarUrl = useAppStore((s) => s.avatarUrl);

  // Favorites Lookup Set
  const favoriteIds = useMemo(() => {
    return new Set(
      (favorites || []).map((f) => f.id || `${f.source}:${f.externalId}`)
    );
  }, [favorites]);

  const trendingRecipes = trendingData?.recipes || [];
  const quickRecipes = quickData?.recipes || [];

  // Featured "Today's Pick" recipe
  const featuredRecipe: Recipe | null = useMemo(() => {
    if (trendingRecipes.length > 0) {
      return trendingRecipes[0];
    }
    return null;
  }, [trendingRecipes]);

  // Remaining trending recipes for carousel
  const carouselTrendingRecipes = useMemo(() => {
    if (trendingRecipes.length > 1) {
      return trendingRecipes.slice(1);
    }
    return trendingRecipes;
  }, [trendingRecipes]);

  const displayName =
    user?.firstName ||
    userProfile?.displayName ||
    user?.fullName ||
    'Foodie';

  const effectiveAvatarUrl =
    storedAvatarUrl ||
    userProfile?.avatarUrl ||
    (isSignedIn ? user?.imageUrl : undefined);

  const greeting = getTimeGreeting();

  // Favorite toggle handler with toast/alert
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
        'Please sign in to save dishes to your personal favorites collection.',
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

  // Surprise Me Handler
  const handleSurpriseMe = () => {
    const candidatePool = [...trendingRecipes, ...quickRecipes];
    if (candidatePool.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidatePool.length);
      const chosen = candidatePool[randomIndex];
      router.push({
        pathname: '/recipe/[id]',
        params: { id: chosen.id },
      } as any);
    } else {
      router.push({
        pathname: '/recipe/[id]',
        params: { id: 'themealdb:52865' },
      } as any);
    }
  };

  // Clear Recently Viewed Handler
  const handleClearHistory = () => {
    Alert.alert(
      'Clear Recipe History',
      'Are you sure you want to clear your recently explored recipes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearRecentMutation.mutate(),
        },
      ]
    );
  };

  // Responsive constraint
  const isWide = windowWidth > 768;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ======================================================== */}
        {/* A. PERSONALIZED HEADER                                   */}
        {/* ======================================================== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>
              {greeting.text}, {displayName} 
            </Text>
            <Text style={styles.subGreetingText}>Aaj kya banega?</Text>
          </View>

          <View style={styles.headerRight}>
            {/* Favorites Shortcut with Badge */}
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
              onPress={() => router.push('/favorites')}
              accessibilityRole="button"
              accessibilityLabel="View Saved Favorites"
            >
              <Ionicons
                name={favorites && favorites.length > 0 ? 'heart' : 'heart-outline'}
                size={21}
                color={favorites && favorites.length > 0 ? '#D94B45' : '#20563F'}
              />
              {favorites && favorites.length > 0 && (
                <View style={styles.favoriteBadge}>
                  <Text style={styles.favoriteBadgeText}>
                    {favorites.length > 9 ? '9+' : favorites.length}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Profile Avatar / Shortcut */}
            <Pressable
              style={({ pressed }) => [
                styles.avatarWrapper,
                pressed && styles.iconButtonPressed,
              ]}
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel="View Profile"
            >
              {effectiveAvatarUrl ? (
                <Image
                  source={{ uri: effectiveAvatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* ======================================================== */}
        {/* B. SMART SEARCH BAR TRIGGER                              */}
        {/* ======================================================== */}
        <Pressable
          style={({ pressed }) => [
            styles.searchBar,
            pressed && styles.searchBarPressed,
          ]}
          onPress={() => router.push('/(tabs)/search')}
          accessibilityRole="button"
          accessibilityLabel="Find recipes, ingredients, cuisines"
        >
          <Ionicons
            name="search-outline"
            size={20}
            color="#20563F"
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder}>
            Find recipes, ingredients...
          </Text>
          <View style={styles.filterButton}>
            <Ionicons name="options-outline" size={17} color="#20563F" />
          </View>
        </Pressable>

        {/* ======================================================== */}
        {/* C. QUICK START TILES                                     */}
        {/* ======================================================== */}
        <View style={styles.quickStartSection}>
          <Text style={styles.quickStartHeader}>Quick Start</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickStartScrollContent}
          >
            {/* Tile 1: Cook with Ingredients */}
            <Pressable
              style={({ pressed }) => [
                styles.quickTile,
                { backgroundColor: '#F2F7F4' },
                pressed && styles.tilePressed,
              ]}
              onPress={() => router.push('/(tabs)/search')}
              accessibilityRole="button"
              accessibilityLabel="Cook With Ingredients"
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#E0EDE5' }]}>
                <Ionicons name="basket-outline" size={20} color="#20563F" />
              </View>
              <Text style={styles.tileTitle} numberOfLines={1}>
                Pantry Cook
              </Text>
              <Text style={styles.tileSubtitle} numberOfLines={1}>
                Use what you own
              </Text>
            </Pressable>

            {/* Tile 2: Quick Meals */}
            <Pressable
              style={({ pressed }) => [
                styles.quickTile,
                { backgroundColor: '#FFF7ED' },
                pressed && styles.tilePressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/discover',
                  params: { maxTime: '20' },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="15-20 Min Quick Meals"
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="flash-outline" size={20} color="#EA580C" />
              </View>
              <Text style={styles.tileTitle} numberOfLines={1}>
                Quick Meals
              </Text>
              <Text style={styles.tileSubtitle} numberOfLines={1}>
                15–20 min dishes
              </Text>
            </Pressable>

            {/* Tile 3: Surprise Me */}
            <Pressable
              style={({ pressed }) => [
                styles.quickTile,
                { backgroundColor: '#EFF6FF' },
                pressed && styles.tilePressed,
              ]}
              onPress={handleSurpriseMe}
              accessibilityRole="button"
              accessibilityLabel="Surprise Me with a Random Recipe"
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="dice-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.tileTitle} numberOfLines={1}>
                Surprise Me
              </Text>
              <Text style={styles.tileSubtitle} numberOfLines={1}>
                Chef's random pick
              </Text>
            </Pressable>

            {/* Tile 4: AI Recipe Studio */}
            <Pressable
              style={({ pressed }) => [
                styles.quickTile,
                { backgroundColor: '#F5F3FF' },
                pressed && styles.tilePressed,
              ]}
              onPress={() => setIsAiModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Create Recipe with AI"
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="sparkles" size={19} color="#7C3AED" />
              </View>
              <Text style={styles.tileTitle} numberOfLines={1}>
                AI Recipe
              </Text>
              <Text style={styles.tileSubtitle} numberOfLines={1}>
                Custom creation
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* ======================================================== */}
        {/* D. FEATURED RECIPE — "TODAY'S PICK"                      */}
        {/* ======================================================== */}
        {isLoadingTrending ? (
          <View style={styles.featuredSkeletonWrapper}>
            <Skeleton width="100%" height={260} borderRadius={22} />
          </View>
        ) : featuredRecipe ? (
          <FeaturedRecipeCard
            recipe={featuredRecipe}
            isFavorite={favoriteIds.has(featuredRecipe.id)}
            onPress={(id) =>
              router.push({
                pathname: '/recipe/[id]',
                params: { id },
              } as any)
            }
            onToggleFavorite={() =>
              handleToggleFavorite({
                id: featuredRecipe.id,
                title: featuredRecipe.title,
                image: featuredRecipe.image,
                cuisine: featuredRecipe.cuisine,
                cookTimeMins: featuredRecipe.cookTimeMins,
                servings: featuredRecipe.servings,
                difficulty: featuredRecipe.difficulty,
                isVeg: featuredRecipe.dietary?.vegetarian,
              })
            }
          />
        ) : null}

        {/* ======================================================== */}
        {/* E. FOOD PREFERENCE FILTER                                */}
        {/* ======================================================== */}
        <View style={styles.dietFilterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dietScrollContent}
          >
            {DIET_OPTIONS.map((opt) => {
              const isSelected = selectedDiet === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    styles.dietPill,
                    isSelected && styles.dietPillSelected,
                    pressed && styles.dietPillPressed,
                  ]}
                  onPress={() => setSelectedDiet(opt.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter: ${opt.label}`}
                >
                  <Text style={styles.dietPillIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.dietPillText,
                      isSelected && styles.dietPillTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ======================================================== */}
        {/* F. MEAL CATEGORIES                                       */}
        {/* ======================================================== */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Meal Categories</Text>
              <Text style={styles.sectionSubtitle}>Explore dishes by time of day</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/discover')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="See all categories"
            >
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.categoryCard,
                  { backgroundColor: cat.bgColor },
                  pressed && styles.categoryCardPressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/discover',
                    params: { category: cat.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Category: ${cat.name}`}
              >
                <View style={styles.categoryIconCircle}>{cat.icon}</View>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ======================================================== */}
        {/* G. TRENDING RECIPES                                      */}
        {/* ======================================================== */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Trending Recipes</Text>
              <Text style={styles.sectionSubtitle}>Most loved culinary dishes</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/discover')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="See all trending recipes"
            >
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          {isLoadingTrending ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3].map((key) => (
                <View key={key} style={styles.skeletonCardVertical}>
                  <Skeleton width="100%" height={140} borderRadius={18} style={{ marginBottom: 10 }} />
                  <Skeleton width="80%" height={18} borderRadius={6} style={{ marginBottom: 6 }} />
                  <Skeleton width="50%" height={14} borderRadius={4} />
                </View>
              ))}
            </ScrollView>
          ) : isTrendingError ? (
            <ErrorState
              title="Couldn't load trending recipes"
              message="Please check your connection and tap to retry."
              onRetry={() => refetchTrending()}
            />
          ) : carouselTrendingRecipes.length === 0 ? (
            <EmptyState
              title="No recipes found"
              message="Try switching your diet filter to see more dishes."
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalRecipeScroll}
            >
              {carouselTrendingRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  id={recipe.id}
                  title={recipe.title}
                  image={recipe.image}
                  cuisine={recipe.cuisine}
                  cookTimeMins={recipe.cookTimeMins}
                  servings={recipe.servings}
                  difficulty={recipe.difficulty}
                  isVeg={recipe.dietary?.vegetarian}
                  isAiGenerated={recipe.isAiGenerated}
                  rating={recipe.rating}
                  isFavorite={favoriteIds.has(recipe.id)}
                  onToggleFavorite={() =>
                    handleToggleFavorite({
                      id: recipe.id,
                      title: recipe.title,
                      image: recipe.image,
                      cuisine: recipe.cuisine,
                      cookTimeMins: recipe.cookTimeMins,
                      servings: recipe.servings,
                      difficulty: recipe.difficulty,
                      isVeg: recipe.dietary?.vegetarian,
                    })
                  }
                  onPress={(id) =>
                    router.push({
                      pathname: '/recipe/[id]',
                      params: { id },
                    } as any)
                  }
                  variant="vertical"
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ======================================================== */}
        {/* H. AI RECIPE STUDIO — PREMIUM AI CARD                     */}
        {/* ======================================================== */}
        <Pressable
          style={({ pressed }) => [
            styles.aiStudioCard,
            pressed && styles.aiStudioCardPressed,
          ]}
          onPress={() => setIsAiModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open AI Recipe Studio"
        >
          <View style={styles.aiStudioContent}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={12} color="#7C3AED" />
              <Text style={styles.aiBadgeText}>AI RECIPE STUDIO</Text>
            </View>

            <Text style={styles.aiHeading}>Your ingredients. Your recipe.</Text>
            <Text style={styles.aiSubtext}>
              Personalized recipes powered by Google Gemini, tailored strictly to what is in your kitchen.
            </Text>

            <View style={styles.aiCtaButton}>
              <Text style={styles.aiCtaText}>Create Recipe</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.aiGraphicWrapper}>
            <View style={styles.aiIconBubble}>
              <Ionicons name="sparkles" size={28} color="#7C3AED" />
            </View>
          </View>
        </Pressable>

        {/* ======================================================== */}
        {/* I. QUICK & EASY (UNDER 30 MINS)                           */}
        {/* ======================================================== */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Quick & Easy</Text>
              <Text style={styles.sectionSubtitle}>Ready in 30 minutes or less</Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/discover',
                  params: { maxTime: '30' },
                })
              }
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="See all quick meals"
            >
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          {isLoadingQuick ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3].map((key) => (
                <View key={key} style={styles.skeletonCardVertical}>
                  <Skeleton width="100%" height={140} borderRadius={18} style={{ marginBottom: 10 }} />
                  <Skeleton width="80%" height={18} borderRadius={6} style={{ marginBottom: 6 }} />
                  <Skeleton width="50%" height={14} borderRadius={4} />
                </View>
              ))}
            </ScrollView>
          ) : isQuickError ? (
            <ErrorState
              title="Couldn't load quick meals"
              message="Please check your connection and tap to retry."
              onRetry={() => refetchQuick()}
            />
          ) : quickRecipes.length === 0 ? (
            <EmptyState
              title="No quick meals found"
              message="Explore full recipe collection in Discover."
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalRecipeScroll}
            >
              {quickRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  id={recipe.id}
                  title={recipe.title}
                  image={recipe.image}
                  cuisine={recipe.cuisine}
                  cookTimeMins={recipe.cookTimeMins}
                  servings={recipe.servings}
                  difficulty={recipe.difficulty}
                  isVeg={recipe.dietary?.vegetarian}
                  isAiGenerated={recipe.isAiGenerated}
                  rating={recipe.rating}
                  isFavorite={favoriteIds.has(recipe.id)}
                  onToggleFavorite={() =>
                    handleToggleFavorite({
                      id: recipe.id,
                      title: recipe.title,
                      image: recipe.image,
                      cuisine: recipe.cuisine,
                      cookTimeMins: recipe.cookTimeMins,
                      servings: recipe.servings,
                      difficulty: recipe.difficulty,
                      isVeg: recipe.dietary?.vegetarian,
                    })
                  }
                  onPress={(id) =>
                    router.push({
                      pathname: '/recipe/[id]',
                      params: { id },
                    } as any)
                  }
                  variant="vertical"
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ======================================================== */}
        {/* J. RECENTLY VIEWED SECTION                                */}
        {/* ======================================================== */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
              <Text style={styles.sectionSubtitle}>Resume your culinary discovery</Text>
            </View>
            {recentlyViewed && recentlyViewed.length > 0 && (
              <Pressable
                onPress={handleClearHistory}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Clear Recently Viewed History"
              >
                <Text style={styles.clearHistoryText}>Clear</Text>
              </Pressable>
            )}
          </View>

          {isLoadingRecent ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3].map((key) => (
                <View key={key} style={styles.skeletonCardVertical}>
                  <Skeleton width="100%" height={140} borderRadius={18} style={{ marginBottom: 10 }} />
                  <Skeleton width="80%" height={18} borderRadius={6} style={{ marginBottom: 6 }} />
                </View>
              ))}
            </ScrollView>
          ) : recentlyViewed && recentlyViewed.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalRecipeScroll}
            >
              {recentlyViewed.map((item) => (
                <RecipeCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  cuisine={item.cuisine}
                  cookTimeMins={item.cookTimeMins}
                  servings={item.servings}
                  difficulty={item.difficulty as any}
                  isVeg={item.isVeg}
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
                      isVeg: item.isVeg,
                    })
                  }
                  onPress={(id) =>
                    router.push({
                      pathname: '/recipe/[id]',
                      params: { id },
                    } as any)
                  }
                  variant="vertical"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.recentEmptyCard}>
              <View style={styles.recentEmptyIconBubble}>
                <Ionicons name="time-outline" size={24} color="#777D76" />
              </View>
              <Text style={styles.recentEmptyTitle}>
                Your explored recipes will appear here
              </Text>
              <Text style={styles.recentEmptySubtitle}>
                Browse recipes to build your cooking history and quickly resume dishes you love.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* AI Recipe Generator Modal */}
      <AiRecipeModal
        visible={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFBF1',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContentWide: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },

  /* A. Header Styles */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingTop: 4,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  greetingText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    color: '#252821',
    letterSpacing: -0.3,
  },
  subGreetingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
    color: '#777D76',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  iconButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  favoriteBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#D94B45',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  favoriteBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  avatarWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#20563F',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#20563F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  /* B. Smart Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E5DC',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 18,
    shadowColor: '#20563F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBarPressed: {
    borderColor: '#20563F',
    backgroundColor: '#FAF8F2',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#777D76',
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* C. Quick Start Section */
  quickStartSection: {
    marginBottom: 20,
  },
  quickStartHeader: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#252821',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  quickStartScrollContent: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    gap: 12,
  },
  quickTile: {
    width: 146,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  tilePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#252821',
    marginBottom: 1,
  },
  tileSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#777D76',
  },

  /* D. Featured Recipe Skeleton */
  featuredSkeletonWrapper: {
    marginBottom: 20,
  },

  /* E. Food Preference Filter */
  dietFilterSection: {
    marginBottom: 20,
  },
  dietScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5DC',
    gap: 6,
  },
  dietPillSelected: {
    backgroundColor: '#20563F',
    borderColor: '#20563F',
  },
  dietPillPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  dietPillIcon: {
    fontSize: 12,
  },
  dietPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#252821',
  },
  dietPillTextSelected: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },

  /* General Section Styles */
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: '#252821',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#777D76',
    marginTop: 1,
  },
  seeAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#20563F',
  },
  clearHistoryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#D94B45',
  },

  /* F. Categories */
  categoryScroll: {
    paddingVertical: 2,
    gap: 10,
  },
  categoryCard: {
    width: 68,
    height: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.95 }],
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#252821',
    textAlign: 'center',
  },

  /* G. Carousels */
  horizontalRecipeScroll: {
    paddingVertical: 4,
  },
  skeletonCardVertical: {
    width: 220,
    marginRight: 14,
  },

  /* H. AI Recipe Studio Card */
  aiStudioCard: {
    backgroundColor: '#F3EEFF',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  aiStudioCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  aiStudioContent: {
    flex: 1,
    paddingRight: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 4,
    marginBottom: 6,
  },
  aiBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    color: '#6D28D9',
    letterSpacing: 0.5,
  },
  aiHeading: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#4C1D95',
    marginBottom: 4,
    lineHeight: 21,
  },
  aiSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#5B21B6',
    lineHeight: 16.5,
    marginBottom: 10,
  },
  aiCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 5,
  },
  aiCtaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  aiGraphicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
  },

  /* Recently Viewed Empty State */
  recentEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E5DC',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  recentEmptyIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3EFE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  recentEmptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#252821',
    textAlign: 'center',
    marginBottom: 4,
  },
  recentEmptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#777D76',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 290,
  },
});
