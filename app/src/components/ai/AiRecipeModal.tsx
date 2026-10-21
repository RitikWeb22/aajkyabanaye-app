import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { Colors } from '../../constants/theme';
import { Button } from '../ui/Button';
import { useGenerateAiRecipe, useAiQuota } from '../../hooks/useRecipes';

export interface AiRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialIngredients?: string[];
  initialDietary?: 'veg' | 'non-veg' | 'vegan';
}

const COOKING_STEPS = [
  'Analyzing your pantry ingredients...',
  'Pairing authentic regional spices...',
  'Crafting step-by-step instructions...',
  'Balancing portions and cooking times...',
  'Finalizing chef presentation...',
];

export function AiRecipeModal({
  visible,
  onClose,
  initialPrompt = '',
  initialIngredients = [],
  initialDietary,
}: AiRecipeModalProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const [prompt, setPrompt] = useState(initialPrompt);
  const [dietary, setDietary] = useState<'veg' | 'non-veg' | 'vegan' | undefined>(initialDietary);
  const [servings, setServings] = useState(4);
  const [maxTime, setMaxTime] = useState<number | undefined>(30);
  const [ingredients, setIngredients] = useState<string[]>(initialIngredients);
  const [newIngredient, setNewIngredient] = useState('');
  const [cookingMsgIdx, setCookingMsgIdx] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial props
  useEffect(() => {
    if (visible) {
      if (initialPrompt) setPrompt(initialPrompt);
      if (initialIngredients.length > 0) setIngredients(initialIngredients);
      if (initialDietary) setDietary(initialDietary);
      setErrorMessage(null);
    }
  }, [visible, initialPrompt, initialIngredients, initialDietary]);

  // Quota hook
  const { data: quotaData, refetch: refetchQuota } = useAiQuota(Boolean(visible && isSignedIn));

  // Generation mutation
  const { mutate: generateRecipe, isPending } = useGenerateAiRecipe();

  // Rotate cooking status messages while pending
  useEffect(() => {
    let interval: any;
    if (isPending) {
      interval = setInterval(() => {
        setCookingMsgIdx((prev) => (prev + 1) % COOKING_STEPS.length);
      }, 2500);
    } else {
      setCookingMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [isPending]);

  const handleAddIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (ing: string) => {
    setIngredients((prev) => prev.filter((i) => i !== ing));
  };

  const handleGenerate = () => {
    setErrorMessage(null);

    generateRecipe(
      {
        prompt: prompt.trim() || undefined,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        dietary,
        servings,
        maxTime,
      },
      {
        onSuccess: (response) => {
          onClose();
          refetchQuota();
          router.push({
            pathname: '/recipe/[id]',
            params: { id: response.data.id },
          } as any);
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.error?.message ||
            err?.message ||
            'Failed to generate recipe. Please try again.';
          setErrorMessage(msg);
        },
      }
    );
  };

  const remainingQuota = quotaData?.remaining ?? 5;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Ionicons name="sparkles" size={18} color={Colors.accent.DEFAULT} />
                <Text style={styles.modalTitle}>AI Recipe Studio</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Tell our chef what you want, or cook with your exact ingredients
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.text.DEFAULT} />
            </Pressable>
          </View>

          {/* Daily Quota Indicator */}
          <View style={styles.quotaPillRow}>
            <View style={styles.quotaPill}>
              <Ionicons name="flash" size={13} color="#E88B27" />
              <Text style={styles.quotaPillText}>
                {isSignedIn ? `${remainingQuota} / 5 AI recipes left today` : 'Daily Chef AI Generation'}
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Loading / Generating State */}
            {isPending ? (
              <View style={styles.loadingContainer}>
                <View style={styles.cookingAnimationCircle}>
                  <Text style={styles.cookingEmoji}>👨‍🍳</Text>
                  <ActivityIndicator
                    size="large"
                    color={Colors.primary.DEFAULT}
                    style={styles.spinnerOverlay}
                  />
                </View>

                <Text style={styles.cookingStepText}>
                  {COOKING_STEPS[cookingMsgIdx]}
                </Text>
                <Text style={styles.cookingDisclaimer}>
                  Formulating ingredients, measurements, and cooking temperatures...
                </Text>
              </View>
            ) : (
              <>
                {/* Error Banner */}
                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error.DEFAULT} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Prompt Input */}
                <Text style={styles.sectionLabel}>What would you like to make?</Text>
                <TextInput
                  style={styles.promptInput}
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="e.g. Dhaba style egg bhujiya, butter chicken, paneer tikka, or pasta..."
                  placeholderTextColor={Colors.text.muted}
                  multiline
                  numberOfLines={3}
                />

                {/* Ingredients Included */}
                <Text style={styles.sectionLabel}>Pantry Ingredients to Include</Text>
                <View style={styles.ingredientsBox}>
                  <View style={styles.ingredientChipsRow}>
                    {ingredients.map((ing) => (
                      <View key={ing} style={styles.ingredientChip}>
                        <Text style={styles.ingredientChipText}>{ing}</Text>
                        <Pressable onPress={() => handleRemoveIngredient(ing)} hitSlop={6}>
                          <Ionicons name="close-circle" size={14} color={Colors.primary.DEFAULT} />
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  {/* Add Ingredient Input */}
                  <View style={styles.addIngRow}>
                    <TextInput
                      style={styles.addIngInput}
                      value={newIngredient}
                      onChangeText={setNewIngredient}
                      placeholder="Add another ingredient..."
                      placeholderTextColor={Colors.text.muted}
                      onSubmitEditing={handleAddIngredient}
                    />
                    <Pressable
                      style={styles.addIngBtn}
                      onPress={handleAddIngredient}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>

                {/* Servings & Cook Time Row */}
                <View style={styles.optionsRow}>
                  {/* Servings Stepper */}
                  <View style={styles.optionCol}>
                    <Text style={styles.sectionLabel}>Servings</Text>
                    <View style={styles.stepperContainer}>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => setServings((s) => Math.max(1, s - 1))}
                      >
                        <Ionicons name="remove" size={16} color={Colors.text.DEFAULT} />
                      </Pressable>
                      <Text style={styles.stepperValue}>{servings}</Text>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => setServings((s) => Math.min(12, s + 1))}
                      >
                        <Ionicons name="add" size={16} color={Colors.text.DEFAULT} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Max Time Filter */}
                  <View style={styles.optionCol}>
                    <Text style={styles.sectionLabel}>Target Time</Text>
                    <View style={styles.stepperContainer}>
                      <Pressable
                        style={[styles.timePill, maxTime === 20 && styles.timePillActive]}
                        onPress={() => setMaxTime(20)}
                      >
                        <Text style={[styles.timePillText, maxTime === 20 && styles.timePillTextActive]}>
                          20m
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.timePill, maxTime === 30 && styles.timePillActive]}
                        onPress={() => setMaxTime(30)}
                      >
                        <Text style={[styles.timePillText, maxTime === 30 && styles.timePillTextActive]}>
                          30m
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.timePill, maxTime === undefined && styles.timePillActive]}
                        onPress={() => setMaxTime(undefined)}
                      >
                        <Text style={[styles.timePillText, maxTime === undefined && styles.timePillTextActive]}>
                          Any
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimerBox}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.disclaimerText}>
                    AI generated recipes are custom formulated for culinary inspiration. Use your personal judgment regarding food safety and allergens.
                  </Text>
                </View>

                {/* Action Button */}
                <Button
                  title={isSignedIn ? "Generate Custom Recipe ✨" : "Sign In to Generate"}
                  onPress={handleGenerate}
                  variant="primary"
                  size="lg"
                  fullWidth
                  style={{ marginTop: 14 }}
                  disabled={isPending || (isSignedIn && remainingQuota <= 0)}
                />
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.background.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: Colors.text.DEFAULT,
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F2EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaPillRow: {
    marginBottom: 12,
  },
  quotaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderColor: '#FCE7C8',
  },
  quotaPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#A05A18',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.text.DEFAULT,
    marginTop: 12,
    marginBottom: 6,
  },
  promptInput: {
    backgroundColor: '#F7F4EC',
    borderRadius: 14,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.text.DEFAULT,
    minHeight: 65,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dietPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F2EB',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dietPillActive: {
    backgroundColor: '#EAF5EC',
    borderColor: Colors.primary.DEFAULT,
  },
  dietPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },
  dietPillTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary.DEFAULT,
  },
  ingredientsBox: {
    backgroundColor: '#F7F4EC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  ingredientChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5EC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  ingredientChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: Colors.primary.DEFAULT,
  },
  addIngRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addIngInput: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  addIngBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  optionCol: {
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F2EB',
    borderRadius: 12,
    padding: 3,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
  },
  timePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 10,
  },
  timePillActive: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  timePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: Colors.text.DEFAULT,
  },
  timePillTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F6F0',
    padding: 10,
    borderRadius: 12,
    marginTop: 14,
    gap: 6,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
    lineHeight: 15,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0ED',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F8C8BF',
  },
  errorText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.error.DEFAULT,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  cookingAnimationCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EAF5EC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 18,
  },
  cookingEmoji: {
    fontSize: 36,
  },
  spinnerOverlay: {
    position: 'absolute',
  },
  cookingStepText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.primary.DEFAULT,
    textAlign: 'center',
    marginBottom: 6,
  },
  cookingDisclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});
