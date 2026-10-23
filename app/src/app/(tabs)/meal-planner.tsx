import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@clerk/expo';
import { Colors } from '../../constants/theme';
import { Button, IconButton, Badge, Skeleton, EmptyState } from '../../components/ui';
import { apiClient } from '../../services/api/apiClient';
import {
  useMealPlan,
  useAddMealPlanEntry,
  useDeleteMealPlanEntry,
  useMealPlanSuggestions,
  useGenerateGroceryFromMealPlan,
} from '../../hooks/useMealPlan';

/**
 * Returns Monday of the week for a given date in local time,
 * normalized to midnight to avoid date drift issues.
 */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sun, 1 is Mon...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Formats a Date object into a local YYYY-MM-DD string,
 * avoiding UTC offset date shifts.
 */
function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

const SLOT_CONFIG: Record<
  string,
  {
    name: string;
    time: string;
    icon: keyof typeof Ionicons.glyphMap;
    placeholder: string;
  }
> = {
  breakfast: {
    name: 'Breakfast',
    time: '8:30 AM',
    icon: 'sunny-outline',
    placeholder: 'Choose something energizing for breakfast',
  },
  lunch: {
    name: 'Lunch',
    time: '1:00 PM',
    icon: 'restaurant-outline',
    placeholder: 'Plan a wholesome lunch for your day',
  },
  snack: {
    name: 'Evening Snack',
    time: '5:00 PM',
    icon: 'cafe-outline',
    placeholder: 'Pick a light bite or tea-time snack',
  },
  dinner: {
    name: 'Dinner',
    time: '8:30 PM',
    icon: 'moon-outline',
    placeholder: 'Select a comforting dinner to end the day',
  },
};

const SLOT_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export default function MealPlannerScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Navigation week state
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Loading tracking for specific entry delete
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);

  // Modal State for adding a recipe to a slot
  const [pickerModalSlot, setPickerModalSlot] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilterDiet, setModalFilterDiet] = useState<'all' | 'veg' | 'quick'>('all');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const closePickerModal = useCallback(() => {
    setPickerModalSlot(null);
    setModalSearch('');
    setModalFilterDiet('all');
    setSearchResults(null);
    setIsSearchingOnline(false);
    setSearchError(null);
    setAddingRecipeId(null);
  }, []);

  const weekStartStr = useMemo(() => formatDateISO(currentMonday), [currentMonday]);

  // Actual real-world Monday & date string for "Today" and current week detection
  const actualCurrentMondayStr = useMemo(() => formatDateISO(getMonday(new Date())), []);
  const todayDateStr = useMemo(() => formatDateISO(new Date()), []);
  const isCurrentWeek = weekStartStr === actualCurrentMondayStr;

  // Compute 7 days of the week (Monday - Sunday)
  const weekDays = useMemo(() => {
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateISO(d);
      days.push({
        short: dayNames[i],
        full: fullDayNames[i],
        dayNum: d.getDate(),
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        dateStr,
        isToday: dateStr === todayDateStr,
      });
    }
    return days;
  }, [currentMonday, todayDateStr]);

  const selectedDay = weekDays[selectedDayIndex] || weekDays[0];

  // Friendly week range label (e.g. "19–25 Oct" or "28 Dec – 3 Jan 2027")
  const weekRangeLabel = useMemo(() => {
    if (!weekDays.length) return '';
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.month === last.month && first.year === last.year) {
      return `${first.dayNum}–${last.dayNum} ${first.month}`;
    } else if (first.year === last.year) {
      return `${first.dayNum} ${first.month} – ${last.dayNum} ${last.month}`;
    }
    return `${first.dayNum} ${first.month} ${first.year} – ${last.dayNum} ${last.month} ${last.year}`;
  }, [weekDays]);

  // Queries & Mutations
  const { data: mealPlan, isLoading: isLoadingPlan } = useMealPlan(weekStartStr);
  const addEntryMutation = useAddMealPlanEntry();
  const deleteEntryMutation = useDeleteMealPlanEntry();
  const generateGroceryMutation = useGenerateGroceryFromMealPlan();

  // Suggestions Query for active slot picker
  const { data: suggestions, isLoading: isLoadingSuggestions } = useMealPlanSuggestions(
    selectedDay.dateStr,
    pickerModalSlot || '',
    Boolean(pickerModalSlot)
  );

  // Weekly Stats
  const totalPlannedInWeek = mealPlan?.entries?.length || 0;

  const daysWithMealsCount = useMemo(() => {
    if (!mealPlan?.entries) return 0;
    const set = new Set(mealPlan.entries.map((e) => e.date));
    return set.size;
  }, [mealPlan?.entries]);

  const emptySlotsCount = Math.max(0, 28 - totalPlannedInWeek);
  const progressPercent = Math.min(100, Math.round((totalPlannedInWeek / 28) * 100));

  // Count planned meals for each day of the week
  const mealsCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    mealPlan?.entries?.forEach((e) => {
      counts[e.date] = (counts[e.date] || 0) + 1;
    });
    return counts;
  }, [mealPlan?.entries]);

  // Entries for the currently selected day
  const entriesForSelectedDay = useMemo(() => {
    if (!mealPlan?.entries) return {};
    const map: Record<string, any> = {};
    mealPlan.entries.forEach((e) => {
      if (e.date === selectedDay.dateStr) {
        map[e.slot] = e;
      }
    });
    return map;
  }, [mealPlan?.entries, selectedDay.dateStr]);

  // Base list of suggestions or search results
  const baseSuggestionsList = useMemo(() => {
    return searchResults || suggestions || [];
  }, [searchResults, suggestions]);

  // Counts for modal filter chips
  const filterCounts = useMemo(() => {
    const all = baseSuggestionsList.length;
    const veg = baseSuggestionsList.filter((r: any) => Boolean(r.isVeg)).length;
    const quick = baseSuggestionsList.filter(
      (r: any) => (r.cookTimeMins || 30) <= 30
    ).length;
    return { all, veg, quick };
  }, [baseSuggestionsList]);

  // Filtered suggestions displayed in bottom sheet
  const displaySuggestions = useMemo(() => {
    return baseSuggestionsList.filter((rec: any) => {
      if (modalFilterDiet === 'veg' && !rec.isVeg) return false;
      if (modalFilterDiet === 'quick' && (rec.cookTimeMins || 30) > 30) return false;
      if (!modalSearch.trim() || searchResults) return true;
      const q = modalSearch.toLowerCase().trim();
      const titleMatch = rec.title?.toLowerCase().includes(q);
      const cuisineMatch = rec.cuisine?.toLowerCase().includes(q);
      return Boolean(titleMatch || cuisineMatch);
    });
  }, [baseSuggestionsList, modalFilterDiet, modalSearch, searchResults]);

  const handleGlobalSearch = async () => {
    if (!modalSearch.trim() || isSearchingOnline) return;
    try {
      setIsSearchingOnline(true);
      setSearchError(null);
      const res = await apiClient.smartSearch({ q: modalSearch.trim(), limit: 12 });
      const mapped = (res.data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        image: r.image,
        cuisine: r.cuisine || 'World / Fusion',
        isVeg: Boolean(r.dietary?.vegetarian),
        cookTimeMins: (r.cookTimeMins || 25) + (r.prepTimeMins || 10),
        servings: r.servings || 4,
      }));
      setSearchResults(mapped);
    } catch (err: any) {
      console.error('Modal global search error:', err);
      setSearchError(err?.message || 'Failed to search online recipes.');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleGoToToday = () => {
    const today = new Date();
    const mon = getMonday(today);
    setCurrentMonday(mon);
    // Find today's day-of-week index (Monday=0, ..., Sunday=6)
    const dayIndex = (today.getDay() + 6) % 7;
    setSelectedDayIndex(dayIndex);
  };

  const handleSelectSuggestion = (recipe: any) => {
    if (!pickerModalSlot || addEntryMutation.isPending) return;

    setAddingRecipeId(recipe.id);
    addEntryMutation.mutate(
      {
        weekStart: weekStartStr,
        date: selectedDay.dateStr,
        slot: pickerModalSlot as any,
        recipeId: recipe.id,
        servings: recipe.servings || 4,
        snapshot: {
          title: recipe.title,
          image: recipe.image,
          cuisine: recipe.cuisine,
          isVeg: recipe.isVeg,
          cookTimeMins: recipe.cookTimeMins,
        },
      },
      {
        onSuccess: () => {
          closePickerModal();
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Could not add recipe to meal plan.');
          setAddingRecipeId(null);
        },
      }
    );
  };

  const handleConfirmDeleteEntry = (entryId: string, recipeTitle: string) => {
    Alert.alert(
      'Remove Meal?',
      `Are you sure you want to remove "${recipeTitle}" from your schedule?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDeletingEntryId(entryId);
            deleteEntryMutation.mutate(
              {
                entryId,
                weekStart: weekStartStr,
              },
              {
                onSettled: () => setDeletingEntryId(null),
                onError: (err: any) => {
                  Alert.alert('Error', err?.message || 'Could not remove meal.');
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleGenerateGroceryList = () => {
    if (totalPlannedInWeek === 0) {
      Alert.alert(
        'Empty Meal Plan',
        'Add at least one recipe to your weekly meal plan before generating a consolidated grocery list.'
      );
      return;
    }

    generateGroceryMutation.mutate(
      {
        weekStart: weekStartStr,
        title: `Weekly Groceries (${weekRangeLabel})`,
      },
      {
        onSuccess: (data) => {
          Alert.alert(
            'Grocery List Created! 🎉',
            `Consolidated ingredients for your weekly meals into "${data.name}".`,
            [
              {
                text: 'View Grocery List',
                onPress: () => router.push('/grocery-list'),
              },
              { text: 'Done', style: 'cancel' },
            ]
          );
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Could not generate grocery list.');
        },
      }
    );
  };

  // Signed-Out State
  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Your Meal Plan</Text>
          <Text style={styles.screenSubtitle}>
            Plan your week, one delicious meal at a time.
          </Text>
        </View>

        <View style={styles.authPromptContainer}>
          <View style={styles.authIconCircle}>
            <Ionicons name="calendar" size={38} color={Colors.primary.DEFAULT} />
          </View>
          <Text style={styles.authTitle}>Plan your week, effortlessly</Text>
          <Text style={styles.authSubtitle}>
            Schedule breakfast, lunch, snacks, and dinner across 7 days, and auto-generate consolidated grocery lists with a single tap.
          </Text>
          <Button
            title="Sign In to Start Planning"
            onPress={() => router.push('/(auth)/sign-in')}
            variant="primary"
            size="lg"
            icon={<Ionicons name="log-in-outline" size={20} color="#FFFFFF" />}
            style={{ width: '88%', marginTop: 10 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 3. Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.screenTitle}>Your Meal Plan</Text>
            <Text style={styles.screenSubtitle}>
              Plan your week, one delicious meal at a time.
            </Text>
          </View>

          <View style={styles.headerControlsRow}>
            {!isCurrentWeek && (
              <Pressable
                onPress={handleGoToToday}
                style={styles.todayShortcutBtn}
                accessibilityRole="button"
                accessibilityLabel="Jump to Current Week"
              >
                <Ionicons name="today-outline" size={13} color={Colors.primary.DEFAULT} />
                <Text style={styles.todayShortcutText}>Today</Text>
              </Pressable>
            )}

            <View style={styles.weekNavGroup}>
              <Pressable
                onPress={handlePrevWeek}
                style={styles.weekNavBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Previous week"
              >
                <Ionicons name="chevron-back" size={18} color={Colors.text.DEFAULT} />
              </Pressable>
              <Pressable
                onPress={handleNextWeek}
                style={styles.weekNavBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Next week"
              >
                <Ionicons name="chevron-forward" size={18} color={Colors.text.DEFAULT} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Date range & total planned meals indicator */}
        <View style={styles.headerMetaRow}>
          <View style={styles.dateRangeBadge}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary.DEFAULT} />
            <Text style={styles.dateRangeText}>{weekRangeLabel}</Text>
          </View>

          <View style={styles.totalMealsBadge}>
            <Ionicons name="restaurant-outline" size={13} color={Colors.accent.DEFAULT} />
            <Text style={styles.totalMealsText}>
              {totalPlannedInWeek} {totalPlannedInWeek === 1 ? 'meal' : 'meals'} planned
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 4. Weekly Calendar Selector */}
        <View style={styles.calendarStripSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarStripContent}
          >
            {weekDays.map((d, index) => {
              const isSelected = index === selectedDayIndex;
              const plannedCount = mealsCountByDate[d.dateStr] || 0;

              return (
                <Pressable
                  key={d.dateStr}
                  onPress={() => setSelectedDayIndex(index)}
                  style={({ pressed }) => [
                    styles.dayCard,
                    isSelected && styles.dayCardActive,
                    d.isToday && !isSelected && styles.dayCardToday,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${d.full}, ${d.dayNum} ${d.month}. ${plannedCount} meals planned`}
                >
                  {/* Today mini-indicator */}
                  {d.isToday && (
                    <View
                      style={[
                        styles.todayMiniBadge,
                        isSelected && styles.todayMiniBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.todayMiniText,
                          isSelected && styles.todayMiniTextActive,
                        ]}
                      >
                        TODAY
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[
                      styles.dayShortText,
                      isSelected && styles.dayTextActive,
                      d.isToday && !isSelected && styles.dayTextTodayMuted,
                    ]}
                  >
                    {d.short}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumText,
                      isSelected && styles.dayTextActive,
                    ]}
                  >
                    {d.dayNum}
                  </Text>

                  {/* Planned meals indicators */}
                  <View style={styles.dayMealsIndicatorRow}>
                    {plannedCount > 0 ? (
                      <View
                        style={[
                          styles.dayCountPill,
                          isSelected && styles.dayCountPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayCountPillText,
                            isSelected && styles.dayCountPillTextActive,
                          ]}
                        >
                          {plannedCount}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.dayDotEmpty} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 6. Weekly Progress Summary */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pie-chart-outline" size={16} color={Colors.primary.DEFAULT} />
              <Text style={styles.progressTitle}>Weekly Progress</Text>
            </View>
            <Text style={styles.progressPercentText}>{progressPercent}% planned</Text>
          </View>

          {/* Progress Bar Track */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>

          {/* Metric Stats Grid */}
          <View style={styles.progressStatsRow}>
            <View style={styles.progressStatCol}>
              <Text style={styles.progressStatVal}>{totalPlannedInWeek} / 28</Text>
              <Text style={styles.progressStatLabel}>Meals Planned</Text>
            </View>
            <View style={styles.progressStatDivider} />
            <View style={styles.progressStatCol}>
              <Text style={styles.progressStatVal}>{daysWithMealsCount} / 7</Text>
              <Text style={styles.progressStatLabel}>Active Days</Text>
            </View>
            <View style={styles.progressStatDivider} />
            <View style={styles.progressStatCol}>
              <Text style={styles.progressStatVal}>{emptySlotsCount}</Text>
              <Text style={styles.progressStatLabel}>Empty Slots</Text>
            </View>
          </View>
        </View>

        {/* 5. Daily Schedule Header */}
        <View style={styles.dailyScheduleHeader}>
          <View>
            <Text style={styles.dailyScheduleTitle}>{selectedDay.full}'s Menu</Text>
            <Text style={styles.dailyScheduleSubtitle}>
              Choose what you'll cook throughout the day.
            </Text>
          </View>
          <View style={styles.dailyScheduleDateBadge}>
            <Text style={styles.dailyScheduleDateText}>
              {selectedDay.dayNum} {selectedDay.month}
            </Text>
          </View>
        </View>

        {/* 5. Daily Meal Slots */}
        {isLoadingPlan ? (
          <View style={styles.loadingSkeletonsWrapper}>
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} width="100%" height={96} borderRadius={20} />
            ))}
          </View>
        ) : (
          <View style={styles.slotsWrapper}>
            {SLOT_ORDER.map((slotKey) => {
              const cfg = SLOT_CONFIG[slotKey];
              const entry = entriesForSelectedDay[slotKey];
              const isDeletingThis = deletingEntryId === entry?.id;

              return (
                <View key={slotKey} style={styles.slotCard}>
                  {/* Slot Title & Scheduled Time Header */}
                  <View style={styles.slotHeader}>
                    <View style={styles.slotTitleRow}>
                      <View style={styles.slotIconCircle}>
                        <Ionicons
                          name={cfg.icon}
                          size={16}
                          color={Colors.primary.DEFAULT}
                        />
                      </View>
                      <Text style={styles.slotName}>{cfg.name}</Text>
                    </View>
                    <View style={styles.slotTimeBadge}>
                      <Ionicons name="time-outline" size={12} color={Colors.text.muted} />
                      <Text style={styles.slotTime}>{cfg.time}</Text>
                    </View>
                  </View>

                  {/* Occupied Meal Card */}
                  {entry ? (
                    <View style={styles.plannedMealCard}>
                      <Pressable
                        style={styles.plannedMealTouch}
                        onPress={() =>
                          router.push(
                            `/recipe/${entry.recipeRef.source}:${entry.recipeRef.externalId}`
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`View recipe ${entry.snapshot.title}`}
                      >
                        <Image
                          source={
                            entry.snapshot.image
                              ? { uri: entry.snapshot.image }
                              : require('../../../assets/images/logo.png')
                          }
                          style={styles.mealThumb}
                          contentFit="cover"
                          transition={200}
                        />

                        <View style={styles.mealMetaCol}>
                          <Text style={styles.mealTitle} numberOfLines={2}>
                            {entry.snapshot.title}
                          </Text>

                          <View style={styles.mealSubRow}>
                            <Badge type={entry.snapshot.isVeg ? 'veg' : 'nonVeg'} />
                            <Text style={styles.mealCuisine} numberOfLines={1}>
                              {entry.snapshot.cuisine || 'Curry'}
                            </Text>
                            {entry.snapshot.cookTimeMins && (
                              <Text style={styles.mealTime}>
                                • {entry.snapshot.cookTimeMins}m
                              </Text>
                            )}
                          </View>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={Colors.border.DEFAULT}
                          style={{ marginHorizontal: 4 }}
                        />
                      </Pressable>

                      {/* Remove meal action button */}
                      <Pressable
                        onPress={() =>
                          handleConfirmDeleteEntry(entry.id, entry.snapshot.title)
                        }
                        style={styles.deleteEntryBtn}
                        hitSlop={10}
                        disabled={isDeletingThis}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${entry.snapshot.title}`}
                      >
                        {isDeletingThis ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    /* Empty Meal Slot */
                    <Pressable
                      style={({ pressed }) => [
                        styles.emptySlotRow,
                        pressed && { backgroundColor: '#F3EFE6' },
                      ]}
                      onPress={() => setPickerModalSlot(slotKey)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add recipe to ${cfg.name}`}
                    >
                      <View style={styles.emptyAddIconCircle}>
                        <Ionicons name="add" size={18} color={Colors.primary.DEFAULT} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.emptySlotMainText}>Add a recipe</Text>
                        <Text style={styles.emptySlotSubText} numberOfLines={1}>
                          {cfg.placeholder}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={Colors.text.muted}
                      />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 7. Smart Grocery List Card */}
        <View style={styles.groceryCtaCard}>
          <View style={styles.groceryCtaIconCol}>
            <View style={styles.groceryIconCircle}>
              <Ionicons name="basket-outline" size={24} color={Colors.primary.DEFAULT} />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.groceryTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.groceryCtaTitle}>Your smart shopping list</Text>
                <View style={styles.swiggyCoBrandBadge}>
                  <Ionicons name="flash" size={9} color="#FFFFFF" />
                  <Text style={styles.swiggyCoBrandText}>Powered by Swiggy</Text>
                </View>
              </View>
              <View style={styles.groceryCountPill}>
                <Text style={styles.groceryCountPillText}>
                  {totalPlannedInWeek} planned
                </Text>
              </View>
            </View>

            <Text style={styles.groceryCtaSubtitle}>
              Combine ingredients from this week's planned meals into one consolidated grocery list.
            </Text>

            <Button
              title={
                totalPlannedInWeek === 0
                  ? 'Plan meals to generate grocery list'
                  : 'Generate Grocery List'
              }
              onPress={handleGenerateGroceryList}
              loading={generateGroceryMutation.isPending}
              disabled={totalPlannedInWeek === 0 || generateGroceryMutation.isPending}
              variant="accent"
              size="md"
              icon={<Ionicons name="cart" size={18} color="#FFFFFF" />}
              style={{ marginTop: 12, alignSelf: 'flex-start' }}
            />
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* 8. Recipe Picker Bottom Sheet Modal */}
      <Modal
        visible={Boolean(pickerModalSlot)}
        transparent
        animationType="slide"
        onRequestClose={closePickerModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closePickerModal} />

          <View style={[styles.modalCard, { maxHeight: screenHeight * 0.88 }]}>
            {/* Drag Handle Indicator */}
            <View style={styles.modalHandle} />

            {/* Bottom Sheet Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Add {pickerModalSlot ? SLOT_CONFIG[pickerModalSlot]?.name : 'Meal'}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  Balanced suggestions for {selectedDay.full} ({selectedDay.dayNum} {selectedDay.month})
                </Text>
              </View>
              <IconButton
                icon={<Ionicons name="close" size={20} color={Colors.text.DEFAULT} />}
                onPress={closePickerModal}
                variant="ghost"
                size="sm"
                accessibilityLabel="Close picker"
              />
            </View>

            {/* Search Input Bar */}
            <View style={styles.modalSearchBar}>
              <Ionicons
                name="search"
                size={18}
                color={Colors.text.muted}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={`Search recipes (e.g. paneer, soup, dal)...`}
                placeholderTextColor={Colors.text.muted}
                value={modalSearch}
                onChangeText={(text) => {
                  setModalSearch(text);
                  if (!text.trim()) setSearchResults(null);
                  setSearchError(null);
                }}
                returnKeyType="search"
                onSubmitEditing={handleGlobalSearch}
              />
              {modalSearch.length > 0 && (
                <Pressable
                  onPress={() => {
                    setModalSearch('');
                    setSearchResults(null);
                    setSearchError(null);
                  }}
                  hitSlop={8}
                  style={{ padding: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={18} color={Colors.text.muted} />
                </Pressable>
              )}
              {modalSearch.trim().length >= 2 && !searchResults && (
                <Pressable
                  style={styles.searchActionBtn}
                  onPress={handleGlobalSearch}
                  disabled={isSearchingOnline}
                  accessibilityRole="button"
                  accessibilityLabel="Search online"
                >
                  {isSearchingOnline ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.searchActionBtnText}>Search</Text>
                  )}
                </Pressable>
              )}
            </View>

            {/* Quick Filter Chips */}
            <View style={styles.filterChipsRow}>
              <Pressable
                style={[
                  styles.filterChip,
                  modalFilterDiet === 'all' && styles.filterChipActive,
                ]}
                onPress={() => setModalFilterDiet('all')}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    modalFilterDiet === 'all' && styles.filterChipTextActive,
                  ]}
                >
                  All ({filterCounts.all})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.filterChip,
                  modalFilterDiet === 'veg' && styles.filterChipActive,
                ]}
                onPress={() => setModalFilterDiet('veg')}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    modalFilterDiet === 'veg' && styles.filterChipTextActive,
                  ]}
                >
                  🟢 Veg Only ({filterCounts.veg})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.filterChip,
                  modalFilterDiet === 'quick' && styles.filterChipActive,
                ]}
                onPress={() => setModalFilterDiet('quick')}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    modalFilterDiet === 'quick' && styles.filterChipTextActive,
                  ]}
                >
                  ⚡ Under 30m ({filterCounts.quick})
                </Text>
              </Pressable>

              {searchResults && (
                <Pressable
                  style={styles.filterChipReset}
                  onPress={() => {
                    setSearchResults(null);
                    setModalSearch('');
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={12} color="#D94B45" />
                  <Text style={styles.filterChipResetText}>Reset</Text>
                </Pressable>
              )}
            </View>

            {/* Search error notice */}
            {searchError && (
              <View style={styles.modalErrorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.modalErrorText}>{searchError}</Text>
              </View>
            )}

            {/* Suggestions / Results Scroll View */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {isLoadingSuggestions || isSearchingOnline ? (
                <View style={styles.modalLoadingState}>
                  <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
                  <Text style={styles.modalLoadingText}>
                    {isSearchingOnline
                      ? 'Searching recipes across database...'
                      : 'Finding balanced recipes for this slot...'}
                  </Text>
                </View>
              ) : displaySuggestions.length > 0 ? (
                <>
                  <Text style={styles.suggestionCountText}>
                    {searchResults
                      ? `Found ${displaySuggestions.length} recipes for "${modalSearch}":`
                      : `Recommended for ${pickerModalSlot ? SLOT_CONFIG[pickerModalSlot]?.name : 'this slot'} (${displaySuggestions.length}):`}
                  </Text>

                  {displaySuggestions.map((rec: any) => {
                    const isAddingThis = addingRecipeId === rec.id && addEntryMutation.isPending;

                    return (
                      <Pressable
                        key={rec.id}
                        onPress={() => handleSelectSuggestion(rec)}
                        disabled={addEntryMutation.isPending}
                        style={({ pressed }) => [
                          styles.suggestionCard,
                          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${rec.title}`}
                      >
                        <Image
                          source={
                            rec.image
                              ? { uri: rec.image }
                              : require('../../../assets/images/logo.png')
                          }
                          style={styles.sugThumb}
                          contentFit="cover"
                          transition={200}
                        />
                        <View style={styles.sugInfo}>
                          <Text style={styles.sugTitle} numberOfLines={2}>
                            {rec.title}
                          </Text>
                          <View style={styles.sugMeta}>
                            <Badge type={rec.isVeg ? 'veg' : 'nonVeg'} />
                            <Text style={styles.sugSubText} numberOfLines={1}>
                              {rec.cuisine || 'Curry'} • {rec.cookTimeMins || 25}m • {rec.servings || 4} serv
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.addCircleBtn,
                            isAddingThis && { backgroundColor: Colors.accent.DEFAULT },
                          ]}
                        >
                          {isAddingThis ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="add" size={20} color="#FFFFFF" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}

                  <Pressable
                    style={styles.browseMoreBtn}
                    onPress={() => {
                      closePickerModal();
                      router.push('/(tabs)/discover');
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="compass-outline" size={18} color={Colors.primary.DEFAULT} />
                    <Text style={styles.browseMoreText}>Explore more recipes in Discover</Text>
                  </Pressable>
                </>
              ) : modalSearch.trim().length >= 2 && !searchResults ? (
                <View style={styles.noFilterMatchContainer}>
                  <Ionicons name="search-outline" size={36} color={Colors.text.muted} />
                  <Text style={styles.noFilterMatchTitle}>
                    No recommendations match "{modalSearch}"
                  </Text>
                  <Text style={styles.noFilterMatchSubtitle}>
                    Search our entire recipe database for matching meals
                  </Text>
                  <Pressable
                    style={styles.searchGlobalCtaBtn}
                    onPress={handleGlobalSearch}
                    accessibilityRole="button"
                  >
                    <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.searchGlobalCtaText}>
                      Search all recipes for "{modalSearch}"
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <EmptyState
                  title="No recipes found"
                  message="Try clearing your search query or switching your filter chips."
                  iconName="restaurant-outline"
                />
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFBF2', // Warm cream background
  },

  /* Screen Header */
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE1',
    backgroundColor: '#FFFBF2',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: Colors.text.DEFAULT,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 2,
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  todayShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#EBF4EF',
    borderWidth: 1,
    borderColor: '#D2E5DA',
  },
  todayShortcutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary.DEFAULT,
  },
  weekNavGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  dateRangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE5D8',
  },
  dateRangeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary.DEFAULT,
  },
  totalMealsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE9C8',
  },
  totalMealsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#9A5B0B',
  },

  /* Scrollable Body */
  mainScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },

  /* Calendar Strip */
  calendarStripSection: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  calendarStripContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  dayCard: {
    width: 60,
    height: 84,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DA',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  dayCardActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
    shadowColor: Colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  dayCardToday: {
    borderColor: Colors.primary.DEFAULT,
    borderWidth: 1.5,
  },
  todayMiniBadge: {
    backgroundColor: '#EAF5EC',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginBottom: 2,
  },
  todayMiniBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  todayMiniText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    color: Colors.primary.DEFAULT,
    letterSpacing: 0.5,
  },
  todayMiniTextActive: {
    color: '#FFFFFF',
  },
  dayShortText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.muted,
  },
  dayNumText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.text.DEFAULT,
    lineHeight: 22,
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  dayTextTodayMuted: {
    color: Colors.primary.DEFAULT,
    fontFamily: 'Inter_600SemiBold',
  },
  dayMealsIndicatorRow: {
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCountPill: {
    backgroundColor: '#E8F3EC',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  dayCountPillActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dayCountPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: Colors.primary.DEFAULT,
  },
  dayCountPillTextActive: {
    color: '#FFFFFF',
  },
  dayDotEmpty: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4DFD3',
  },

  /* Weekly Progress Summary Card */
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#ECE8DD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
  },
  progressPercentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary.DEFAULT,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3EFE6',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary.DEFAULT,
  },
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  progressStatVal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: Colors.text.DEFAULT,
  },
  progressStatLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 1,
  },
  progressStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EDE8DE',
  },

  /* Daily Schedule Header */
  dailyScheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyScheduleTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: Colors.text.DEFAULT,
  },
  dailyScheduleSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 1,
  },
  dailyScheduleDateBadge: {
    backgroundColor: '#F7F3EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E4DA',
  },
  dailyScheduleDateText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },

  /* Slots */
  loadingSkeletonsWrapper: {
    gap: 12,
  },
  slotsWrapper: {
    gap: 12,
  },
  slotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE8DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F6F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
  },
  slotTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF7F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  slotTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
  },

  /* Planned Meal Row */
  plannedMealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9F4',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EFECE2',
  },
  plannedMealTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#EAE5D8',
  },
  mealMetaCol: {
    flex: 1,
    paddingRight: 4,
  },
  mealTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.text.DEFAULT,
    lineHeight: 18,
  },
  mealSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  mealCuisine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
  },
  mealTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
  },
  deleteEntryBtn: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty Slot Card */
  emptySlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9F4',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8E3D8',
    borderStyle: 'dashed',
    gap: 10,
  },
  emptyAddIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DDD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotMainText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary.DEFAULT,
  },
  emptySlotSubText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 1,
  },

  /* Smart Grocery List Card */
  groceryCtaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#ECE7DB',
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  groceryCtaIconCol: {
    paddingTop: 2,
  },
  groceryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groceryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  groceryCtaTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.text.DEFAULT,
  },
  groceryCountPill: {
    backgroundColor: '#FFF5E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE3B8',
  },
  groceryCountPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#B45309',
  },
  groceryCtaSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 3,
    lineHeight: 18,
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

  /* Signed-Out State */
  authPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  authIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EAF5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#D4E8DA',
  },
  authTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: Colors.text.DEFAULT,
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  /* 8. Bottom Sheet Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#DCD8CE',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE1',
  },
  modalHeaderTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  modalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text.DEFAULT,
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 1,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F2EA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E3D8',
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.text.DEFAULT,
    paddingVertical: 4,
  },
  searchActionBtn: {
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 6,
  },
  searchActionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F4EFE6',
    borderWidth: 1,
    borderColor: '#E6E0D3',
  },
  filterChipActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  filterChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.text.DEFAULT,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  filterChipReset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FDD8D8',
    marginLeft: 'auto',
  },
  filterChipResetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#D94B45',
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F0',
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  modalErrorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  modalScrollView: {
    maxHeight: 460,
  },
  modalScrollContent: {
    paddingVertical: 8,
    paddingBottom: 20,
  },
  modalLoadingState: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    color: Colors.text.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  suggestionCountText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9F4',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFECE2',
  },
  sugThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#EAE5D8',
    marginRight: 12,
  },
  sugInfo: {
    flex: 1,
    marginRight: 8,
  },
  sugTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.text.DEFAULT,
    lineHeight: 18,
  },
  sugMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sugSubText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
  },
  addCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: '#F0F6F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4E5DA',
    gap: 8,
  },
  browseMoreText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary.DEFAULT,
  },
  noFilterMatchContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  noFilterMatchTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
    marginTop: 10,
    textAlign: 'center',
  },
  noFilterMatchSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  searchGlobalCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchGlobalCtaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
