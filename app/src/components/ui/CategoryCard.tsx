import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';

export interface CategoryCardProps {
  id: string;
  name: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  bgColor?: string;
  onPress: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function CategoryCard({
  id,
  name,
  icon,
  isActive = false,
  bgColor = '#F5EFE3',
  onPress,
  style,
}: CategoryCardProps) {
  return (
    <Pressable
      onPress={() => onPress(id)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: isActive ? '#1E5038' : bgColor },
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Category: ${name}`}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[styles.title, isActive && styles.titleActive]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#252923',
    textAlign: 'center',
  },
  titleActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});

