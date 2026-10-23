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

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Array.isArray(id) ? id[0] : id;

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isShoppingSheetVisible, setIsShoppingSheetVisible] = useState(false);

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
            onPress={() => router.back()}
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
            onPress={() => router.back()}
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
          onPress={() => router.back()}
          variant="card"
          size="sm"
          accessibilityLabel="Back"
        />
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {recipe.title}
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

          {/* Quick Stats Grid */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={Colors.primary.DEFAULT} />
              <Text style={styles.statValue}>
                {(recipe.cookTimeMins || 25) + (recipe.prepTimeMins || 10)} m
              </Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={20} color={Colors.primary.DEFAULT} />
              <Text style={styles.statValue}>{currentServings}</Text>
              <Text style={styles.statLabel}>Servings</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={20} color={Colors.primary.DEFAULT} />
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
          <View>
            <Text style={styles.servingsControlTitle}>Adjust Servings</Text>
            <Text style={styles.servingsControlSubtitle}>
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
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.sectionTitle}>Ingredient Checklist</Text>
                <View style={styles.swiggyCoBrandBadge}>
                  <Ionicons name="flash" size={9} color="#FFFFFF" />
                  <Text style={styles.swiggyCoBrandText}>Powered by Swiggy</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Select missing items for 10-minute darkstore delivery
              </Text>
            </View>
            <View style={styles.counterPill}>
              <Text style={styles.counterPillText}>
                {selectedCount} of {totalCount} selected
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
              <Text style={styles.sectionSubtitle}>Tap any step to mark as completed</Text>
            </View>
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

          {/* Steps List */}
          <View style={styles.cardBox}>
            {recipe.steps.map((step) => {
              const isDone = completedSteps.includes(step.order);

              return (
                <Pressable
                  key={step.order}
                  style={[styles.interactiveStepRow, isDone && styles.interactiveStepRowDone]}
                  onPress={() => recipeId && toggleStepDone(recipeId, step.order)}
                >
                  <View style={[styles.stepNumberBadge, isDone && styles.stepNumberBadgeDone]}>
                    {isDone ? (
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.stepNumberText}>{step.order}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepText, isDone && styles.stepTextDone]}>
                    {step.text}
                  </Text>
                </Pressable>
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
            paddingBottom: Math.max(insets.bottom, 14) + 12,
          },
        ]}
      >
        <View style={styles.stickyInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.stickyCountText}>
              {selectedCount > 0 ? `${selectedCount} items selected` : 'No items selected'}
            </Text>
            <View style={styles.swiggyCoBrandBadge}>
              <Ionicons name="flash" size={9} color="#FFFFFF" />
              <Text style={styles.swiggyCoBrandText}>Powered by Swiggy</Text>
            </View>
          </View>
          <Text style={styles.stickySubtext}>
            {selectedCount > 0 ? `10-min delivery • ${currentServings} servings` : 'Check items you need'}
          </Text>
        </View>

        <Button
          title={
            selectedCount === 0
              ? 'Select Ingredients'
              : `Shop Ingredients (${selectedCount}) →`
          }
          onPress={handleShopSelected}
          disabled={selectedCount === 0}
          variant="primary"
          size="md"
          icon={<Ionicons name="cart-outline" size={17} color="#FFFFFF" />}
        />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.DEFAULT,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.DEFAULT,
  },
  topBarTitle: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text.DEFAULT,
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
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EAE5D8',
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
    color: Colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipeTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: Colors.text.DEFAULT,
    lineHeight: 28,
    marginBottom: 6,
  },
  recipeDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: Colors.text.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
    marginTop: 4,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border.DEFAULT,
  },
  servingsControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F4EC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    marginBottom: 20,
  },
  servingsControlTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.text.DEFAULT,
  },
  servingsControlSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: Colors.text.muted,
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
    fontSize: 17,
    color: Colors.text.DEFAULT,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  counterPill: {
    backgroundColor: '#EAF5EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primary.DEFAULT,
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
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bulkBtnHighlight: {
    backgroundColor: '#EAF5EC',
    borderColor: '#C3E4C9',
  },
  bulkBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: Colors.text.DEFAULT,
  },
  progressContainer: {
    backgroundColor: Colors.background.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F0ECE1',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#248A3D',
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
    color: Colors.text.muted,
  },
  progressPercent: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#248A3D',
  },
  resetStepsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F5F3EC',
  },
  resetStepsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.text.muted,
  },
  cardBox: {
    backgroundColor: Colors.background.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    padding: 16,
  },
  interactiveStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingVertical: 4,
  },
  interactiveStepRowDone: {
    opacity: 0.65,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EAF5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberBadgeDone: {
    backgroundColor: '#248A3D',
  },
  stepNumberText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary.DEFAULT,
  },
  stepText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.DEFAULT,
    lineHeight: 22,
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.text.muted,
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
    borderBottomColor: '#F5F3EC',
  },
  subSource: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary.DEFAULT,
    marginRight: 6,
  },
  subAlts: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.text.DEFAULT,
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
    backgroundColor: '#F5F1E8',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  attributionText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: Colors.text.muted,
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
    backgroundColor: Colors.background.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border.DEFAULT,
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
  stickyCountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
  },
  stickySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
  },
  swiggyCoBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#FC8019',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  swiggyCoBrandText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});
