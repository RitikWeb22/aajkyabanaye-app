import React from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/theme';

export type IconButtonVariant = 'primary' | 'secondary' | 'card' | 'outline' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  rounded?: boolean;
  disabled?: boolean;
  badgeCount?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

export function IconButton({
  icon,
  onPress,
  variant = 'card',
  size = 'md',
  rounded = true,
  disabled = false,
  badgeCount,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[`variant_${variant}`],
        rounded ? styles.roundedFull : styles.roundedSm,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {icon}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  sm: {
    width: 44,
    height: 44,
  },
  md: {
    width: 48,
    height: 48,
  },
  lg: {
    width: 56,
    height: 56,
  },
  roundedFull: {
    borderRadius: 9999,
  },
  roundedSm: {
    borderRadius: 12,
  },
  variant_primary: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  variant_secondary: {
    backgroundColor: Colors.secondary.DEFAULT,
  },
  variant_card: {
    backgroundColor: Colors.background.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.border.DEFAULT,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  disabled: {
    opacity: 0.45,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error.DEFAULT,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 12,
  },
});
