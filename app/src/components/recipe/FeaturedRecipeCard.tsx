import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { Recipe } from '../../types/recipe';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface FeaturedRecipeCardProps {
  recipe: Recipe;
  isFavorite?: boolean;
  onPress: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export function FeaturedRecipeCard({
  recipe,
  isFavorite = false,
  onPress,
  onToggleFavorite,
}: FeaturedRecipeCardProps) {
  const isVeg = recipe.dietary?.vegetarian ?? true;
  const cookTime = recipe.cookTimeMins || 25;
  const ratingValue = recipe.rating?.value ?? 4.8;
  const ratingCount = recipe.rating?.count ?? 128;

  return (
    <Pressable
      onPress={() => onPress(recipe.id)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={`Today's Pick: ${recipe.title}`}
    >
      {/* Top Visual Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={
            recipe.image
              ? { uri: recipe.image }
              : require('../../../assets/images/home-banner-dish.png')
          }
          style={styles.image}
          contentFit="cover"
          transition={300}
        />

        {/* Gradient / Shadow Overlay */}
        <View style={styles.imageOverlay} />

        {/* Top Badges */}
        <View style={styles.topBadgeRow}>
          <View style={styles.pickBadge}>
            <Ionicons name="sparkles" size={11} color="#FFFFFF" />
            <Text style={styles.pickBadgeText}>TODAY'S PICK</Text>
          </View>

          {/* Favorite Toggle Button */}
          {onToggleFavorite && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite(recipe.id);
              }}
              style={styles.favoriteButton}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
              hitSlop={8}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? '#D94B45' : '#252923'}
              />
            </Pressable>
          )}
        </View>

        {/* Floating Quick Meta Pill on Image */}
        <View style={styles.floatingImageMeta}>
          <View style={styles.dietDotWrapper}>
            <View
              style={[
                styles.dietDot,
                { backgroundColor: isVeg ? '#248A3D' : '#D94B45' },
              ]}
            />
            <Text style={styles.dietText}>{isVeg ? 'Veg' : 'Non-Veg'}</Text>
          </View>

          {recipe.cuisine ? (
            <Text style={styles.cuisineTag}>• {recipe.cuisine}</Text>
          ) : null}
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        {recipe.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>
        ) : null}

        {/* Meta Row: Time, Difficulty, Rating */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={Colors.primary.DEFAULT} />
            <Text style={styles.metaText}>{cookTime}m prep</Text>
          </View>

          {recipe.difficulty && (
            <View style={styles.metaItem}>
              <Ionicons name="bar-chart-outline" size={13} color={Colors.text.muted} />
              <Text style={styles.metaText}>
                {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
              </Text>
            </View>
          )}

          <View style={styles.metaItem}>
            <Ionicons name="star" size={13} color="#F5A640" />
            <Text style={[styles.metaText, styles.ratingText]}>
              {ratingValue.toFixed(1)}
              <Text style={styles.ratingCount}> ({ratingCount})</Text>
            </Text>
          </View>
        </View>

        {/* Action Button Strip */}
        <View style={styles.actionRow}>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>View Recipe</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>

          {recipe.servings ? (
            <Text style={styles.servingsBadge}>
              Serves {recipe.servings}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFEBE1',
    shadowColor: '#20563F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    overflow: 'hidden',
    marginBottom: 20,
    width: '100%',
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: '#F3EFE6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  pickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20563F',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pickBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  floatingImageMeta: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  dietDotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dietDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dietText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#252923',
  },
  cuisineTag: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#777D76',
    textTransform: 'capitalize',
  },
  content: {
    padding: 16,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#252923',
    lineHeight: 24,
    marginBottom: 4,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#777D76',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#555C53',
  },
  ratingText: {
    color: '#252923',
    fontFamily: 'Inter_600SemiBold',
  },
  ratingCount: {
    fontFamily: 'Inter_400Regular',
    color: '#8A9188',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2EFE8',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20563F',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  ctaButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  servingsBadge: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#777D76',
    backgroundColor: '#F8F6F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
