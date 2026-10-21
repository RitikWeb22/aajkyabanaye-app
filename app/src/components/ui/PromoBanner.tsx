import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface PromoBannerProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  buttonText?: string;
  image?: string | any;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PromoBanner({
  title,
  subtitle,
  badgeText,
  buttonText = 'Explore Now',
  image,
  onPress,
  style,
}: PromoBannerProps) {
  const [hasError, setHasError] = useState(false);
  const fallbackImage = require('../../../assets/images/home-banner-dish.png');

  // Determine image source
  const imageSource = !hasError && image
    ? typeof image === 'string'
      ? { uri: image }
      : image
    : fallbackImage;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={`Banner: ${title}`}
    >
      {/* Text Container with clear flexible proportion */}
      <View style={styles.textContainer}>
        {badgeText && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}

        <View style={styles.button}>
          <Text style={styles.buttonText}>{buttonText}</Text>
          <Ionicons
            name="arrow-forward"
            size={13}
            color="#245C45"
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>

      {/* Appetizing Food Image Graphic - Fixed width, shrink-resistant */}
      <View style={styles.imageContainer}>
        <View style={styles.imageBackdropCircle} />
        <Image
          source={imageSource}
          style={styles.bannerImage}
          contentFit="cover"
          transition={300}
          onError={() => setHasError(true)}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E5038',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#1E5038',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
    minHeight: 148,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
    zIndex: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent.DEFAULT,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 16,
    marginBottom: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary.DEFAULT,
  },
  imageContainer: {
    width: 106,
    height: 106,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    marginLeft: 4,
  },
  imageBackdropCircle: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  bannerImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
});
