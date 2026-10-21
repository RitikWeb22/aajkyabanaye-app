import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const getContainerStyle = (pressed: boolean): StyleProp<ViewStyle> => [
    styles.base,
    styles[size],
    styles[`variant_${variant}`],
    fullWidth && styles.fullWidth,
    pressed && !isDisabled && styles.pressed,
    isDisabled && styles.disabled,
    style,
  ];

  const getTextColor = (): string => {
    if (disabled) return Colors.text.muted;
    switch (variant) {
      case 'outline':
      case 'ghost':
        return Colors.primary.DEFAULT;
      case 'secondary':
        return '#FFFFFF';
      case 'accent':
        return '#FFFFFF';
      case 'danger':
        return '#FFFFFF';
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  const getSpinnerColor = (): string => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return Colors.primary.DEFAULT;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => getContainerStyle(pressed)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getSpinnerColor()} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.text, styles[`text_${size}`], { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    minHeight: 44,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', userSelect: 'none' } as any) : {}),
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 10,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 48,
    borderRadius: 14,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 26,
    minHeight: 56,
    borderRadius: 16,
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 15,
  },
  text_lg: {
    fontSize: 17,
  },
  variant_primary: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  variant_secondary: {
    backgroundColor: Colors.secondary.DEFAULT,
  },
  variant_accent: {
    backgroundColor: Colors.accent.DEFAULT,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary.DEFAULT,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: Colors.error.DEFAULT,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    backgroundColor: Colors.disabled.DEFAULT,
    borderColor: Colors.disabled.DEFAULT,
  },
});
