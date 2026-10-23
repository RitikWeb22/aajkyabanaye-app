import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '../../constants/theme';
import {
  IconButton,
  Button,
  Badge,
  Rating,
  Skeleton,
  EmptyState,
  ErrorState,
  QuantityStepper,
  IngredientCheckbox,
} from '../../components/ui';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import {
  useRecipeDetail,
  useRelatedRecipes,
  useRecordRecentlyViewed,
} from '../../hooks/useRecipes';
import { useAppStore } from '../../store/useAppStore';
import {
  scaleIngredientQuantity,
  getSelectAllIds,
  getOnlyWhatINeedIds,
} from '../../lib/scaling';
import { exportRecipeToPdf } from '../../lib/pdfExport';
import { useAuth } from '@clerk/expo';
import {
  ShoppingReviewSheet,
  ShoppingReviewItem,
} from '../../components/shopping/ShoppingReviewSheet';
import { useIsFavorite, useToggleFavorite } from '../../hooks/useFavorites';
import { SmartCookingTimer } from '../../components/recipe/SmartCookingTimer';

function extractStepMinutes(text: string): number | null {
  const match = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*(?:minutes|minute|mins|min)\b/i);
  if (match) {
    const lower = parseInt(match[1], 10);
    const upper = match[2] ? parseInt(match[2], 10) : lower;
    return Math.max(1, Math.round((lower + upper) / 2));
  }
  return null;
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Array.isArray(id) ? id[0] : id;

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isShoppingSheetVisible, setIsShoppingSheetVisible] = useState(false);

  // Smart Kitchen Timer State
  const [isTimerVisible, setIsTimerVisible] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerStepLabel, setTimerStepLabel] = useState('Cooking Step');

  const handleOpenTimer = (minutes: number = 5, label: string = 'Cooking Step') => {
    setTimerMinutes(minutes);
    setTimerStepLabel(label);
    setIsTimerVisible(true);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  // Queries
  const {
    data: recipe,
    isLoading,
    isError,
    error,
    refetch,
  } = useRecipeDetail(recipeId);

  const { data: relatedRecipes } = useRelatedRecipes(recipeId);
  const recordViewMutation = useRecordRecentlyViewed();

  // Favorites Hook
  const { isSignedIn } = useAuth();
  const { data: isFavorited } = useIsFavorite(recipeId);
  const toggleFavoriteMutation = useToggleFavorite();

  // Zustand Store Integration
  const selectedIngredientsMap = useAppStore((s) => s.selectedIngredients);
  const alreadyHaveIngredientsMap = useAppStore((s) => s.alreadyHaveIngredients);
  const customServingsMap = useAppStore((s) => s.customServings);
  const completedStepsMap = useAppStore((s) => s.completedSteps);

  const toggleIngredient = useAppStore((s) => s.toggleIngredient);
  const selectAllIngredients = useAppStore((s) => s.selectAllIngredients);
  const clearSelectedIngredients = useAppStore((s) => s.clearSelectedIngredients);
  const toggleAlreadyHave = useAppStore((s) => s.toggleAlreadyHave);
  const setCustomServings = useAppStore((s) => s.setCustomServings);
  const toggleStepDone = useAppStore((s) => s.toggleStepDone);
  const resetStepsDone = useAppStore((s) => s.resetStepsDone);

  // Active state for this specific recipe
  const selectedIds = useMemo(() => {
    return (recipeId && selectedIngredientsMap[recipeId]) || [];
  }, [recipeId, selectedIngredientsMap]);

  const alreadyHaveIds = useMemo(() => {
    return (recipeId && alreadyHaveIngredientsMap[recipeId]) || [];
  }, [recipeId, alreadyHaveIngredientsMap]);

  const currentServings = useMemo(() => {
    if (recipeId && customServingsMap[recipeId]) {
      return customServingsMap[recipeId];
    }
    return recipe?.servings || 4;
  }, [recipeId, customServingsMap, recipe?.servings]);

  const completedSteps = useMemo(() => {
    return (recipeId && completedStepsMap[recipeId]) || [];
  }, [recipeId, completedStepsMap]);

  // Record to recently viewed when recipe loads
  useEffect(() => {
    if (recipe && recipeId) {
      recordViewMutation.mutate({
        recipeId,
        snapshot: {
          title: recipe.title,
          image: recipe.image,
          cuisine: recipe.cuisine,
          isVeg: recipe.dietary.vegetarian,
          cookTimeMins: recipe.cookTimeMins,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
        },
      });

      // Default: If no ingredients selected yet, select all by default so user can shop immediately
      if (recipeId && !selectedIngredientsMap[recipeId] && recipe.ingredients?.length) {
        const allIds = recipe.ingredients.map((ing) => ing.id);
        selectAllIngredients(recipeId, allIds);
      }
    }
  }, [recipeId, recipe?.id]);

  // Scaled Ingredients
  const scaledIngredients = useMemo(() => {
    if (!recipe?.ingredients) return [];
    return recipe.ingredients.map((ing) => {
      const scaled = scaleIngredientQuantity(
        ing.quantity,
        recipe.servings || 4,
        currentServings,
        ing.unit,
        ing.note
      );
      return {
        ...ing,
        scaledQuantity: scaled.quantity,
        scaledUnit: scaled.unit,
        formattedQuantity: scaled.formattedQuantity,
      };
    });
  }, [recipe?.ingredients, recipe?.servings, currentServings]);

  // Selection Action Handlers
  const handleSelectAll = () => {
    if (!recipeId || !recipe?.ingredients) return;
    const allIds = getSelectAllIds(recipe.ingredients);
    selectAllIngredients(recipeId, allIds);
  };

  const handleClearAll = () => {
    if (!recipeId) return;
    clearSelectedIngredients(recipeId);
  };

  const handleSelectOnlyNeeded = () => {
    if (!recipeId || !recipe?.ingredients) return;
    const neededIds = getOnlyWhatINeedIds(recipe.ingredients, alreadyHaveIds);
    selectAllIngredients(recipeId, neededIds);
  };

  // Share Recipe
  const handleShare = async () => {
    if (!recipe) return;
    try {
      const ingredientList = scaledIngredients
        .map((ing) => `• ${ing.name}: ${ing.formattedQuantity || ''}`)
        .join('\n');

      const instructions = recipe.steps
        .map((step) => `${step.order}. ${step.text}`)
        .join('\n\n');

      const shareText = `🍳 *${recipe.title}* (${currentServings} Servings)\n\n` +
        `⏱️ Cook Time: ${(recipe.cookTimeMins || 25) + (recipe.prepTimeMins || 10)} mins\n` +
        `🌱 Diet: ${recipe.dietary.vegetarian ? 'Pure Vegetarian' : 'Non-Vegetarian'}\n\n` +
        `🛒 *Ingredients:*\n${ingredientList}\n\n` +
        `👩‍🍳 *Instructions:*\n${instructions}\n\n` +
        `Shared via AajKyaBanaye — "Aaj kya banega? Let's find out!"`;

      await Share.share({
        title: recipe.title,
        message: shareText,
      });
    } catch {
      // Ignored
    }
  };

  // PDF Export
  const handleExportPdf = async () => {
    if (!recipe) return;
    try {
      setIsExportingPdf(true);
      await exportRecipeToPdf(
        recipe,
        currentServings,
        scaledIngredients.map((i) => ({
          name: i.name,
          formattedQuantity: i.formattedQuantity,
        }))
      );
    } catch (err: any) {
      console.warn('PDF export error:', err);
      // Fallback: share formatted text so export always succeeds
      await handleShare();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = () => {
    if (!isSignedIn) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save delicious recipes to your personal favorites collection.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/sign-in') },
        ]
      );
      return;
    }

    if (!recipe || !recipeId) return;

    toggleFavoriteMutation.mutate({
      recipeId,
      isCurrentlyFavorited: Boolean(isFavorited),
      snapshot: {
        title: recipe.title,
        image: recipe.image,
        cuisine: recipe.cuisine,
        isVeg: recipe.dietary.vegetarian,
        cookTimeMins: (recipe.cookTimeMins || 25) + (recipe.prepTimeMins || 10),
        servings: recipe.servings,
        difficulty: recipe.difficulty,
      },
    });
  };

  // Shopping Review Items (Phase 9)
  const shoppingReviewItems: ShoppingReviewItem[] = useMemo(() => {
    return scaledIngredients
      .filter((ing) => selectedIds.includes(ing.id))
      .map((ing) => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.scaledQuantity,
        unit: ing.scaledUnit,
        formattedQuantity: ing.formattedQuantity,
        groceryTerm: ing.groceryTerm || ing.name,
        category: ing.category,
        note: ing.note,
        packQuantity: 1,
      }));
  }, [scaledIngredients, selectedIds]);

  // Shopping Action / Review Sheet (Section 11)
  const handleShopSelected = () => {
    if (!recipe) return;
    if (selectedCount === 0) return;
    setIsShoppingSheetVisible(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <IconButton
            icon={<Ionicons name="arrow-back" size={22} color={Colors.text.DEFAULT} />}
            onPress={handleBack}
            variant="card"
            size="sm"
            accessibilityLabel="Back"
          />
          <Skeleton width={120} height={20} borderRadius={8} />
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Skeleton width="100%" height={260} borderRadius={24} style={{ marginBottom: 20 }} />
          <Skeleton width="75%" height={28} borderRadius={8} style={{ marginBottom: 12 }} />
          <Skeleton width="45%" height={18} borderRadius={6} style={{ marginBottom: 24 }} />
          <Skeleton width="100%" height={140} borderRadius={18} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={200} borderRadius={18} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isError || !recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <IconButton
            icon={<Ionicons name="arrow-back" size={22} color={Colors.text.DEFAULT} />}
            onPress={handleBack}
            variant="card"
            size="sm"
            accessibilityLabel="Back"
          />
          <Text style={styles.topBarTitle}>Recipe Details</Text>
          <View style={{ width: 44 }} />
        </View>
        <ErrorState
          title="Recipe unavailable"
          message={error?.message || 'We could not fetch this recipe. Please check your connection and retry.'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  const selectedCount = selectedIds.length;
  const totalCount = recipe.ingredients.length;
  const completedStepCount = completedSteps.length;
  const stepProgressPercent = Math.round((completedStepCount / Math.max(1, recipe.steps.length)) * 100);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* Top Bar with Share & PDF actions */}
      <View style={styles.topBar}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={Colors.text.DEFAULT} />}
          onPress={handleBack}
          variant="card"
          size="sm"
          accessibilityLabel="Back"
        />
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Recipe Details
        </Text>
        <View style={styles.topBarActions}>
          <IconButton
            icon={
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorited ? '#E11D48' : Colors.text.DEFAULT}
              />
            }
            onPress={handleToggleFavorite}
            variant="card"
            size="sm"
            accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
            style={{ marginRight: 8 }}
          />
          <IconButton
            icon={
              isExportingPdf ? (
                <ActivityIndicator size="small" color={Colors.primary.DEFAULT} />
              ) : (
                <Ionicons name="document-text-outline" size={20} color={Colors.text.DEFAULT} />
              )
            }
            onPress={handleExportPdf}
            variant="card"
            size="sm"
            accessibilityLabel="Export PDF"
            style={{ marginRight: 8 }}
          />
          <IconButton
            icon={<Ionicons name="share-social-outline" size={20} color={Colors.text.DEFAULT} />}
            onPress={handleShare}
            variant="card"
            size="sm"
            accessibilityLabel="Share recipe"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroWrapper}>
          <Image
            source={recipe.image ? { uri: recipe.image } : require('../../../assets/images/logo.png')}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.badgeOverlay}>
            <Badge type={recipe.dietary.vegetarian ? 'veg' : 'nonVeg'} />
            {recipe.isAiGenerated && <Badge type="ai" />}
          </View>

          {/* Quick Floating Kitchen Timer Button */}
          <Pressable
            style={styles.floatingTimerBadge}
            onPress={() => handleOpenTimer(recipe.cookTimeMins || 20, `${recipe.title} Cooking Timer`)}
            accessibilityRole="button"
            accessibilityLabel="Open kitchen timer"
          >
            <Ionicons name="stopwatch" size={13} color="#FFFFFF" />
            <Text style={styles.floatingTimerText}>Kitchen Timer</Text>
          </Pressable>
        </View>

        {/* Recipe Meta Header */}
        <View style={styles.metaSection}>
          <View style={styles.cuisineRow}>
            {recipe.cuisine && <Text style={styles.cuisineText}>{recipe.cuisine} Cuisine</Text>}
            {recipe.rating && (
              <Rating value={recipe.rating.value} count={recipe.rating.count} size="sm" />
            )}
          </View>

          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          {recipe.description && (
            <Text style={styles.recipeDescription}>{recipe.description}</Text>
          )}

          {/* Quick Stats Grid (4 High-Impact Metrics) */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Ionicons name="hourglass-outline" size={18} color="#1C4D38" />
              <Text style={styles.statValue}>{recipe.prepTimeMins || 10}m</Text>
              <Text style={styles.statLabel}>Prep Time</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={18} color="#EA580C" />
              <Text style={styles.statValue}>{recipe.cookTimeMins || 25}m</Text>
              <Text style={styles.statLabel}>Cook Time</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={18} color="#2563EB" />
              <Text style={styles.statValue}>{currentServings}</Text>
              <Text style={styles.statLabel}>Servings</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="restaurant-outline" size={18} color="#1C4D38" />
              <Text style={styles.statValue}>
                {recipe.difficulty ? recipe.difficulty.toUpperCase() : 'EASY'}
              </Text>
              <Text style={styles.statLabel}>Difficulty</Text>
            </View>
          </View>

          {/* AI Notice Disclaimer Banner */}
          {recipe.isAiGenerated && (
            <View style={styles.aiNoticeCard}>
              <View style={styles.aiNoticeHeader}>
                <Ionicons name="sparkles" size={15} color="#7C3AED" />
                <Text style={styles.aiNoticeBadge}>AI GENERATED RECIPE</Text>
              </View>
              <Text style={styles.aiNoticeText}>
                Crafted uniquely with Google Gemini. Verify food safety, internal cooking temperatures, and your individual allergen sensitivities before preparing.
              </Text>
            </View>
          )}
        </View>

        {/* Servings Scaling Control Bar */}
        <View style={styles.servingsControlCard}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.servingsControlTitle}>Adjust Servings</Text>
            <Text style={styles.servingsControlSubtitle} numberOfLines={1}>
              {currentServings !== (recipe.servings || 4)
                ? `Quantities scaled from ${recipe.servings || 4} to ${currentServings}`
                : `Base recipe is set for ${recipe.servings || 4} servings`}
            </Text>
          </View>
          <QuantityStepper
            value={currentServings}
            onChange={(val) => {
              if (recipeId) setCustomServings(recipeId, val);
            }}
            min={1}
            max={24}
            unitLabel="pers"
          />
        </View>

        {/* Interactive Ingredients Checklist */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                <View style={styles.swiggyBrandBadge}>
                  <Ionicons name="flash" size={9} color="#FFFFFF" />
                  <Text style={styles.swiggyBrandText}>Swiggy</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle} numberOfLines={1}>
                Check missing items to order
              </Text>
            </View>
            <View style={styles.counterPill}>
              <Text style={styles.counterPillText}>
                {selectedCount}/{totalCount}
              </Text>
            </View>
          </View>

          {/* Batch Action Buttons Bar */}
          <View style={styles.bulkActionBar}>
            <Pressable style={styles.bulkBtn} onPress={handleSelectAll}>
              <Ionicons name="checkbox-outline" size={14} color={Colors.primary.DEFAULT} />
              <Text style={styles.bulkBtnText}>Select All</Text>
            </Pressable>

            <Pressable style={styles.bulkBtn} onPress={handleClearAll}>
              <Ionicons name="square-outline" size={14} color={Colors.text.muted} />
              <Text style={styles.bulkBtnText}>Clear</Text>
            </Pressable>

            <Pressable
              style={[styles.bulkBtn, styles.bulkBtnHighlight]}
              onPress={handleSelectOnlyNeeded}
            >
              <Ionicons name="sparkles" size={13} color="#245C45" />
              <Text style={[styles.bulkBtnText, { color: '#245C45', fontFamily: 'Inter_600SemiBold' }]}>
                Only What I Need
              </Text>
            </Pressable>
          </View>

          {/* Ingredient Checkbox Items */}
          <View style={{ marginTop: 8 }}>
            {scaledIngredients.map((ing) => {
              const isChecked = selectedIds.includes(ing.id);
              const isHave = alreadyHaveIds.includes(ing.id);

              return (
                <IngredientCheckbox
                  key={ing.id}
                  id={ing.id}
                  name={ing.name}
                  quantity={ing.scaledQuantity}
                  unit={ing.scaledUnit || ing.unit}
                  checked={isChecked}
                  alreadyHave={isHave}
                  onToggleCheck={(id) => {
                    if (recipeId) toggleIngredient(recipeId, id);
                  }}
                  onToggleAlreadyHave={(id) => {
                    if (recipeId) toggleAlreadyHave(recipeId, id);
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* Interactive Cooking Instructions & Step Tracker */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Cooking Instructions</Text>
              <Text style={styles.sectionSubtitle}>Tap steps to complete • Smart timers</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={() => handleOpenTimer(5, 'Kitchen Timer')}
                hitSlop={8}
                style={styles.openTimerHeaderBtn}
              >
                <Ionicons name="stopwatch" size={13} color="#20563F" />
                <Text style={styles.openTimerHeaderText}>Timer</Text>
              </Pressable>
              {completedStepCount > 0 && (
                <Pressable
                  onPress={() => recipeId && resetStepsDone(recipeId)}
                  hitSlop={8}
                  style={styles.resetStepsBtn}
                >
                  <Ionicons name="refresh" size={12} color={Colors.text.muted} />
                  <Text style={styles.resetStepsText}>Reset</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Cooking Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${stepProgressPercent}%` }]} />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                {completedStepCount} of {recipe.steps.length} steps completed
              </Text>
              <Text style={styles.progressPercent}>{stepProgressPercent}%</Text>
            </View>
          </View>

          {/* MasterChef Step Cards List (Cleanly Aligned) */}
          <View style={styles.stepsContainer}>
            {recipe.steps.map((step) => {
              const isDone = completedSteps.includes(step.order);
              const stepMins = extractStepMinutes(step.text);

              return (
                <View
                  key={step.order}
                  style={[styles.stepCard, isDone && styles.stepCardDone]}
                >
                  <View style={styles.stepCardHeader}>
                    <View style={[styles.stepOrderPill, isDone && styles.stepOrderPillDone]}>
                      <Text style={[styles.stepOrderText, isDone && styles.stepOrderTextDone]}>
                        STEP {String(step.order).padStart(2, '0')}
                      </Text>
                    </View>

                    <View style={styles.stepHeaderRight}>
                      {stepMins ? (
                        <Pressable
                          style={styles.stepTimerBtn}
                          onPress={() => handleOpenTimer(stepMins, `Step ${step.order} Timer`)}
                          hitSlop={6}
                        >
                          <Ionicons name="stopwatch-outline" size={13} color="#20563F" />
                          <Text style={styles.stepTimerBtnText}>{stepMins} min timer</Text>
                        </Pressable>
                      ) : null}

                      <Pressable
                        style={[styles.stepCheckbox, isDone && styles.stepCheckboxDone]}
                        onPress={() => recipeId && toggleStepDone(recipeId, step.order)}
                        hitSlop={8}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isDone }}
                        accessibilityLabel={`Mark step ${step.order} completed`}
                      >
                        <Ionicons
                          name={isDone ? 'checkmark' : 'ellipse-outline'}
                          size={15}
                          color={isDone ? '#FFFFFF' : '#9CA3AF'}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={[styles.stepBodyText, isDone && styles.stepBodyTextDone]}>
                    {step.text}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Chef Tips Section (if available) */}
        {recipe.tips && recipe.tips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Chef's Secret Tips 💡</Text>
            </View>
            <View style={styles.tipsCard}>
              {recipe.tips.map((tip, idx) => (
                <View key={idx} style={styles.tipItem}>
                  <Ionicons name="bulb-outline" size={16} color={Colors.accent.DEFAULT} style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ingredient Substitutions (if available) */}
        {recipe.substitutions && recipe.substitutions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Smart Substitutions 🔄</Text>
            </View>
            <View style={styles.cardBox}>
              {recipe.substitutions.map((sub, idx) => (
                <View key={idx} style={[styles.subRow, idx === (recipe.substitutions?.length || 0) - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.subSource}>{sub.ingredient}:</Text>
                  <Text style={styles.subAlts}>{sub.alternatives.join(' or ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Allergen Warnings (if available) */}
        {recipe.allergens && recipe.allergens.length > 0 && (
          <View style={styles.allergenBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#D94B45" />
            <Text style={styles.allergenText}>
              <Text style={{ fontFamily: 'Inter_600SemiBold' }}>Allergen Notice: </Text>
              Contains {recipe.allergens.join(', ')}.
            </Text>
          </View>
        )}

        {/* Provider Attribution */}
        {recipe.attribution &&
          !recipe.attribution.providerName?.toLowerCase().includes('themealdb') && (
            <View style={styles.attributionBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.text.muted} />
              <Text style={styles.attributionText}>
                Recipe provided by {recipe.attribution.providerName}
                {recipe.attribution.license ? ` (${recipe.attribution.license})` : ''}
              </Text>
            </View>
        )}

        {/* Related Recipes */}
        {relatedRecipes && relatedRecipes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You Might Also Like</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedScroll}
            >
              {relatedRecipes.map((rel) => (
                <RecipeCard
                  key={rel.id}
                  id={rel.id}
                  title={rel.title}
                  image={rel.image}
                  cuisine={rel.cuisine}
                  cookTimeMins={rel.cookTimeMins}
                  servings={rel.servings}
                  difficulty={rel.difficulty}
                  isVeg={rel.dietary.vegetarian}
                  isAiGenerated={rel.isAiGenerated}
                  rating={rel.rating}
                  onPress={(targetId) =>
                    router.push({
                      pathname: '/recipe/[id]',
                      params: { id: targetId },
                    } as any)
                  }
                  variant="vertical"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Extra space for sticky bottom bar so content scrolls completely above it */}
        <View style={{ height: 110 + Math.max(insets.bottom, 16) }} />
      </ScrollView>

      {/* Sticky Bottom Shopping Bar (Section 11) */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}
      >
        <View style={styles.stickyInfo}>
          <View style={styles.swiggyRow}>
            <View style={styles.swiggyBrandBadge}>
              <Ionicons name="flash" size={9} color="#FFFFFF" />
              <Text style={styles.swiggyBrandText}>Swiggy</Text>
            </View>
            <Text style={styles.swiggyDeliveryTag}>• 10m Delivery</Text>
          </View>
          <Text style={styles.stickyCountText} numberOfLines={1}>
            {selectedCount > 0
              ? `${selectedCount} item${selectedCount > 1 ? 's' : ''} to order`
              : 'Select ingredients'}
          </Text>
        </View>

        <Pressable
          style={[styles.swiggyOrderBtn, selectedCount === 0 && styles.swiggyOrderBtnDisabled]}
          onPress={handleShopSelected}
          disabled={selectedCount === 0}
        >
          <Ionicons name="bag-handle" size={16} color="#FFFFFF" />
          <Text style={styles.swiggyOrderBtnText}>
            {selectedCount === 0 ? 'Select' : `Order (${selectedCount})`}
          </Text>
        </Pressable>
      </View>

      {/* Shopping Review Sheet (Phase 9) */}
      <ShoppingReviewSheet
        visible={isShoppingSheetVisible}
        onClose={() => setIsShoppingSheetVisible(false)}
        recipeTitle={recipe.title}
        servings={currentServings}
        initialItems={shoppingReviewItems}
        onItemsModified={(updatedItems) => {
          if (recipeId) {
            const remainingIds = updatedItems.map((i) => i.id);
            useAppStore.getState().setSelectedIngredients(recipeId, remainingIds);
          }
        }}
      />

      {/* Smart Cooking Timer Clock Modal & Floating Indicator */}
      <SmartCookingTimer
        visible={isTimerVisible}
        initialMinutes={timerMinutes}
        stepLabel={timerStepLabel}
        onClose={() => setIsTimerVisible(false)}
        onTimerComplete={(label) => {
          Alert.alert('Timer Finished! 🍲', `${label || 'Your cooking step'} is complete! Time to check your pot.`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topBarTitle: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#0F172A',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  heroWrapper: {
    width: '100%',
    height: 250,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    gap: 8,
  },
  floatingTimerBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(28, 77, 56, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingTimerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  metaSection: {
    marginBottom: 18,
  },
  cuisineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cuisineText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#1C4D38',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipeTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  recipeDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#0F172A',
    marginTop: 4,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  servingsControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  servingsControlTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    color: '#0F172A',
  },
  servingsControlSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16.5,
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  counterPill: {
    backgroundColor: '#EBF6F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#1C4D38',
  },
  bulkActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bulkBtnHighlight: {
    backgroundColor: '#EBF6F0',
    borderColor: '#C6E3CD',
  },
  bulkBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#334155',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#64748B',
  },
  progressPercent: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#059669',
  },
  resetStepsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  resetStepsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
  },
  openTimerHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#EBF6F0',
    borderWidth: 1,
    borderColor: '#C6E3CD',
  },
  openTimerHeaderText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#1C4D38',
  },
  stepsContainer: {
    marginTop: 10,
    gap: 12,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  stepCardDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.72,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepOrderPill: {
    backgroundColor: '#EBF6F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepOrderPillDone: {
    backgroundColor: '#E2E8F0',
  },
  stepOrderText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#1C4D38',
    letterSpacing: 0.8,
  },
  stepOrderTextDone: {
    color: '#64748B',
  },
  stepHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  stepTimerBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#C2410C',
  },
  stepCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepCheckboxDone: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  stepBodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14.5,
    color: '#1E293B',
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  stepBodyTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  tipsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  subSource: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#1C4D38',
    marginRight: 6,
  },
  subAlts: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#334155',
  },
  allergenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  allergenText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#991B1B',
  },
  attributionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  attributionText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#64748B',
  },
  relatedScroll: {
    paddingTop: 12,
  },
  aiNoticeCard: {
    marginTop: 14,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 14,
    padding: 12,
  },
  aiNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiNoticeBadge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  aiNoticeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6D28D9',
    lineHeight: 17,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  stickyInfo: {
    flex: 1,
    marginRight: 12,
  },
  swiggyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  swiggyBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#FC8019',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  swiggyBrandText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  swiggyDeliveryTag: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#1C4D38',
  },
  stickyCountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
  swiggyOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#1C4D38',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: '#1C4D38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  swiggyOrderBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  swiggyOrderBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
