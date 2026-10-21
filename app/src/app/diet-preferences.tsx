import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { apiClient } from '../services/api/apiClient';

// Core diet options for recommendation engine
const DIET_OPTIONS = [
  { id: 'Vegetarian', label: 'Pure Veg', icon: 'leaf-outline' },
  { id: 'Eggetarian', label: 'Eggetarian', icon: 'egg-outline' },
  { id: 'Non-Vegetarian', label: 'Non-Veg', icon: 'restaurant-outline' },
  { id: 'Vegan', label: 'Vegan', icon: 'flower-outline' },
] as const;

// Curated cuisines for smart recipe suggestions
const CUISINE_OPTIONS = [
  { id: 'North Indian', label: 'North Indian' },
  { id: 'South Indian', label: 'South Indian' },
  { id: 'Punjabi', label: 'Punjabi' },
  { id: 'Mughlai', label: 'Mughlai' },
  { id: 'Street Food', label: 'Street Food' },
  { id: 'Gujarati', label: 'Gujarati' },
  { id: 'Bengali', label: 'Bengali' },
  { id: 'Indo-Chinese', label: 'Indo-Chinese' },
  { id: 'Italian', label: 'Italian' },
  { id: 'Desserts & Mithai', label: 'Desserts & Sweets' },
];

// Spice tolerance levels
const SPICE_OPTIONS = [
  { id: 'Mild', label: 'Mild' },
  { id: 'Medium', label: 'Medium' },
  { id: 'Spicy', label: 'Spicy' },
  { id: 'Extra Spicy', label: 'Extra Spicy' },
];

// Cooking experience levels
const SKILL_OPTIONS = [
  { id: 'Beginner', title: 'Beginner', subtitle: 'Quick & simple' },
  { id: 'Home Cook', title: 'Home Cook', subtitle: 'Daily favorites' },
  { id: 'Master Chef', title: 'Master Chef', subtitle: 'Elaborate feasts' },
];

// Quick cooking time options
const TIME_OPTIONS = [
  { mins: 15, label: '15m' },
  { mins: 30, label: '30m' },
  { mins: 45, label: '45m' },
  { mins: 60, label: '60m+' },
];

export default function DietPreferencesScreen() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const dietaryPreferences = useAppStore((s) => s.dietaryPreferences);
  const favoriteCuisines = useAppStore((s) => s.favoriteCuisines);
  const spiceLevel = useAppStore((s) => s.spiceLevel);
  const cookingLevel = useAppStore((s) => s.cookingLevel);
  const cookingTimeMins = useAppStore((s) => s.cookingTimeMins);
  const setKitchenPreferences = useAppStore((s) => s.setKitchenPreferences);

  // Kitchen Preferences State
  const [selectedDiet, setSelectedDiet] = useState<string>(
    dietaryPreferences[0] || 'Vegetarian'
  );
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    favoriteCuisines.length > 0 ? favoriteCuisines : ['North Indian', 'Street Food']
  );
  const [selectedSpice, setSelectedSpice] = useState<string>(spiceLevel || 'Medium');
  const [selectedSkill, setSelectedSkill] = useState<string>(
    cookingLevel || 'Home Cook'
  );
  const [selectedTime, setSelectedTime] = useState<number>(cookingTimeMins || 30);

  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const toggleCuisine = (cuisineId: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisineId)
        ? prev.filter((c) => c !== cuisineId)
        : [...prev, cuisineId]
    );
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setNotice(null);

    try {
      // 1. Update local Zustand state
      setKitchenPreferences({
        dietaryPreferences: [selectedDiet],
        favoriteCuisines: selectedCuisines,
        spiceLevel: selectedSpice,
        cookingLevel: selectedSkill,
        cookingTimeMins: selectedTime,
      });

      // 2. Sync to MongoDB API if authenticated
      if (isSignedIn) {
        try {
          await apiClient.updateProfile({
            dietaryPreferences: [selectedDiet],
            favoriteCuisines: selectedCuisines,
            preferredCookingTimeMins: selectedTime,
          });
        } catch (apiErr: any) {
          console.warn('Backend diet preferences sync notice:', apiErr);
        }
      }

      setNotice({ type: 'success', text: 'Diet & kitchen preferences updated!' });

      setTimeout(() => {
        router.back();
      }, 750);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || 'Could not save preferences. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header with Save Action */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.8 },
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.primary.DEFAULT} />
        </Pressable>

        <Text style={styles.headerTitle}>Diet & Cuisines</Text>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.headerSaveBtn,
            pressed && styles.headerSaveBtnPressed,
            isSaving && { opacity: 0.6 },
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save preferences"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.headerSaveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Notification Banner */}
          {notice && (
            <View
              style={[
                styles.noticeBanner,
                notice.type === 'success' ? styles.noticeSuccess : styles.noticeError,
              ]}
            >
              <Ionicons
                name={notice.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={notice.type === 'success' ? '#15803D' : Colors.error.DEFAULT}
              />
              <Text
                style={[
                  styles.noticeText,
                  notice.type === 'success'
                    ? styles.noticeTextSuccess
                    : styles.noticeTextError,
                ]}
              >
                {notice.text}
              </Text>
            </View>
          )}

          {/* Section 1: Dietary Preference */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Dietary Preference</Text>
            <Text style={styles.sectionSubtitle}>
              Filter recipes and meal plans to match your lifestyle
            </Text>

            <View style={styles.dietRow}>
              {DIET_OPTIONS.map((item) => {
                const isSelected = selectedDiet === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedDiet(item.id)}
                    style={[
                      styles.dietPill,
                      isSelected && styles.dietPillActive,
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={15}
                      color={isSelected ? '#FFFFFF' : Colors.primary.DEFAULT}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.dietPillText,
                        isSelected && styles.dietPillTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section 2: Favorite Cuisines */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Favorite Cuisines</Text>
                <Text style={styles.sectionSubtitle}>
                  Choose flavors you love seeing most
                </Text>
              </View>
              <Text style={styles.multiSelectNote}>Select multiple</Text>
            </View>

            <View style={styles.chipsContainer}>
              {CUISINE_OPTIONS.map((cuisine) => {
                const isSelected = selectedCuisines.includes(cuisine.id);
                return (
                  <Pressable
                    key={cuisine.id}
                    onPress={() => toggleCuisine(cuisine.id)}
                    style={[
                      styles.cuisineChip,
                      isSelected && styles.cuisineChipActive,
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.cuisineLabel,
                        isSelected && styles.cuisineLabelActive,
                      ]}
                    >
                      {cuisine.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={13}
                        color="#FFFFFF"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section 3: Spice Tolerance */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Spice Level Preference</Text>
            <View style={styles.spiceRow}>
              {SPICE_OPTIONS.map((item) => {
                const isSelected = selectedSpice === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedSpice(item.id)}
                    style={[
                      styles.spicePill,
                      isSelected && styles.spicePillActive,
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.spicePillText,
                        isSelected && styles.spicePillTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Cooking Experience */}
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
              Cooking Experience
            </Text>
            <View style={styles.skillRow}>
              {SKILL_OPTIONS.map((skill) => {
                const isSelected = selectedSkill === skill.id;
                return (
                  <Pressable
                    key={skill.id}
                    onPress={() => setSelectedSkill(skill.id)}
                    style={[
                      styles.skillCard,
                      isSelected && styles.skillCardActive,
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.skillTitle,
                        isSelected && styles.skillTitleActive,
                      ]}
                    >
                      {skill.title}
                    </Text>
                    <Text
                      style={[
                        styles.skillSubtitle,
                        isSelected && styles.skillSubtitleActive,
                      ]}
                    >
                      {skill.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Maximum Cooking Time */}
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
              Preferred Cooking Time
            </Text>
            <View style={styles.timeRow}>
              {TIME_OPTIONS.map((t) => {
                const isSelected = selectedTime === t.mins;
                return (
                  <Pressable
                    key={t.mins}
                    onPress={() => setSelectedTime(t.mins)}
                    style={[
                      styles.timePill,
                      isSelected && styles.timePillActive,
                      Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        isSelected && styles.timePillTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0', // Warm off-white
  },

  /* Top Bar Header */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DC',
    backgroundColor: '#FFF9F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2DDCF',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: Colors.text.DEFAULT,
  },
  headerSaveBtn: {
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveBtnPressed: {
    backgroundColor: '#1B4735',
    transform: [{ scale: 0.98 }],
  },
  headerSaveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* Scrollable Content */
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingBottom: 36,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
  },

  /* Notification Banner */
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  noticeSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  noticeError: {
    backgroundColor: '#FDE8E8',
    borderColor: Colors.error.DEFAULT,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    marginLeft: 8,
  },
  noticeTextSuccess: {
    color: '#15803D',
  },
  noticeTextError: {
    color: Colors.error.DEFAULT,
  },

  /* Card Sections */
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ECE8DF',
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    color: Colors.text.DEFAULT,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  multiSelectNote: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: Colors.primary.DEFAULT,
    backgroundColor: '#EAF5EC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },

  /* Diet Options */
  dietRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DFD3',
    backgroundColor: '#FAF8F3',
  },
  dietPillActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  dietPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: Colors.text.DEFAULT,
  },
  dietPillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },

  /* Cuisine Chips */
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E4DFD3',
  },
  cuisineChipActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  cuisineLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },
  cuisineLabelActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },

  /* Spice Options */
  spiceRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  spicePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4DFD3',
    backgroundColor: '#FAF8F3',
  },
  spicePillActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  spicePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },
  spicePillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },

  /* Skill Level Cards */
  skillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  skillCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DFD3',
    backgroundColor: '#FAF8F3',
    alignItems: 'center',
  },
  skillCardActive: {
    backgroundColor: '#EAF3ED',
    borderColor: Colors.primary.DEFAULT,
  },
  skillTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.text.DEFAULT,
    textAlign: 'center',
  },
  skillTitleActive: {
    color: Colors.primary.DEFAULT,
  },
  skillSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.text.muted,
    marginTop: 1,
    textAlign: 'center',
  },
  skillSubtitleActive: {
    color: Colors.primary.DEFAULT,
  },

  /* Cooking Time Pills */
  timeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  timePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4DFD3',
    backgroundColor: '#FAF8F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePillActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  timePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },
  timePillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
});
