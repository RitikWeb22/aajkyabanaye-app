import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';

export interface RecipeCardProps {
  id: string;
  title: string;
  image?: string;
  cuisine?: string;
  category?: string;
  cookTimeMins?: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  isVeg?: boolean;
  isAiGenerated?: boolean;
  rating?: { value: number; count: number };
  isFavorite?: boolean;
  onPress: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  variant?: 'vertical' | 'horizontal' | 'grid';
  style?: StyleProp<ViewStyle>;
}

export function RecipeCard({
  id,
  title,
  image,
  cuisine,
  cookTimeMins = 30,
  servings,
  difficulty = 'easy',
  isVeg = true,
  isAiGenerated = false,
  rating,
  isFavorite = false,
  onPress,
  onToggleFavorite,
  variant = 'vertical',
  style,
}: RecipeCardProps) {
  const isHorizontal = variant === 'horizontal';
  const isGrid = variant === 'grid';

  return (
    <Pressable
      onPress={() => onPress(id)}
      style={({ pressed }) => [
        styles.card,
        isGrid
          ? styles.cardGrid
          : isHorizontal
          ? styles.cardHorizontal
          : styles.cardVertical,
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={`Recipe: ${title}`}
    >
      {/* Image Container */}
      <View
        style={
          isGrid
            ? styles.imageWrapperGrid
            : isHorizontal
            ? styles.imageWrapperHorizontal
            : styles.imageWrapperVertical
        }
      >
        <Image
          source={image ? { uri: image } : require('../../../assets/images/logo.png')}
          style={styles.image}
          contentFit="cover"
          transition={250}
        />

        {/* Veg/Non-Veg Badge */}
        <View style={styles.vegBadgeWrapper}>
          <Badge type={isVeg ? 'veg' : 'nonVeg'} />
        </View>

        {/* Floating Rating Pill for Grid cards */}
        {isGrid && rating ? (
          <View style={styles.floatingRatingPill}>
            <Ionicons name="star" size={11} color="#F4A340" />
            <Text style={styles.floatingRatingText}>
              {rating.value.toFixed(1)}
            </Text>
          </View>
        ) : null}

        {/* Cooking Time Overlay for Grid cards */}
        {isGrid ? (
          <View style={styles.floatingTimeBadge}>
            <Ionicons name="time-outline" size={10} color="#FFFFFF" />
            <Text style={styles.floatingTimeText}>{cookTimeMins}m</Text>
          </View>
        ) : null}

        {/* AI Badge Overlay */}
        {isAiGenerated && (
          <View style={styles.aiBadgeWrapper}>
            <Badge type="ai" />
          </View>
        )}

        {/* Favorite Button */}
        {onToggleFavorite && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(id);
            }}
            style={styles.favoriteButton}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={isFavorite ? Colors.error.DEFAULT : Colors.text.DEFAULT}
            />
          </Pressable>
        )}
      </View>

      {/* Content */}
      <View
        style={[
          styles.content,
          isGrid ? styles.contentGrid : isHorizontal && styles.contentHorizontal,
        ]}
      >
        {/* Cuisine & Rating Row (if not grid) */}
        {!isGrid && (
          <View style={styles.metaTopRow}>
            {cuisine ? (
              <Text style={styles.cuisineText}>{cuisine}</Text>
            ) : (
              <View />
            )}
            {rating && <Rating value={rating.value} count={rating.count} size="sm" />}
          </View>
        )}

        {/* For Grid: compact cuisine tag */}
        {isGrid && cuisine ? (
          <Text style={styles.cuisineGridText} numberOfLines={1}>
            {cuisine}
          </Text>
        ) : null}

        {/* Recipe Title */}
        <Text
          style={[styles.title, isGrid && styles.titleGrid]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {title}
        </Text>

        {/* Meta Bottom Badges */}
        <View style={[styles.metaBottomRow, isGrid && styles.metaBottomRowGrid]}>
          {!isGrid && <Badge type="time" timeMins={cookTimeMins} />}
          {difficulty && <Badge type="difficulty" difficulty={difficulty} />}
          {typeof servings === 'number' && (
            <Text style={styles.servingsText}>{servings} serv</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  cardVertical: {
    width: 220,
    marginRight: 14,
  },
  cardHorizontal: {
    flexDirection: 'row',
    width: '100%',
    height: 130,
    marginBottom: 14,
  },
  cardGrid: {
    flex: 1,
    marginBottom: 14,
    minWidth: '46%',
    maxWidth: '49%',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  imageWrapperVertical: {
    width: '100%',
    height: 140,
    backgroundColor: '#F0ECE1',
    position: 'relative',
  },
  imageWrapperHorizontal: {
    width: 125,
    height: '100%',
    backgroundColor: '#F0ECE1',
    position: 'relative',
    overflow: 'hidden',
  },
  imageWrapperGrid: {
    width: '100%',
    height: 135,
    backgroundColor: '#F0ECE1',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  vegBadgeWrapper: {
    position: 'absolute',
    top: 8,
    left: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  floatingRatingPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 12,
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  floatingRatingText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#252923',
  },
  floatingTimeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36, 92, 69, 0.88)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    gap: 3,
  },
  floatingTimeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  aiBadgeWrapper: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 12,
  },
  contentHorizontal: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contentGrid: {
    padding: 10,
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cuisineText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cuisineGridText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.text.DEFAULT,
    lineHeight: 20,
    marginBottom: 8,
  },
  titleGrid: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 6,
    minHeight: 34,
  },
  metaBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaBottomRowGrid: {
    gap: 4,
    marginTop: 2,
  },
  servingsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
    marginLeft: 2,
  },
});
