import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export type BadgeType = 'veg' | 'nonVeg' | 'ai' | 'time' | 'difficulty' | 'tag' | 'custom';

export interface BadgeProps {
  type?: BadgeType;
  label?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeMins?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  type = 'tag',
  label,
  difficulty,
  timeMins,
  style,
  textStyle,
}: BadgeProps) {
  if (type === 'veg') {
    return (
      <View style={[styles.foodMarkBorder, { borderColor: '#248A3D' }, style]}>
        <View style={[styles.foodMarkCircle, { backgroundColor: '#248A3D' }]} />
      </View>
    );
  }

  if (type === 'nonVeg') {
    return (
      <View style={[styles.foodMarkBorder, { borderColor: '#D94B45' }, style]}>
        <View style={[styles.foodMarkCircle, { backgroundColor: '#D94B45' }]} />
      </View>
    );
  }

  if (type === 'ai') {
    return (
      <View style={[styles.aiBadge, style]}>
        <Ionicons name="sparkles" size={12} color="#7C3AED" style={{ marginRight: 4 }} />
        <Text style={[styles.aiBadgeText, textStyle]}>AI Generated</Text>
      </View>
    );
  }

  if (type === 'time' && typeof timeMins === 'number') {
    return (
      <View style={[styles.pillBadge, style]}>
        <Ionicons name="time-outline" size={13} color={Colors.text.muted} style={{ marginRight: 4 }} />
        <Text style={[styles.pillBadgeText, textStyle]}>{timeMins} min</Text>
      </View>
    );
  }

  if (type === 'difficulty' && difficulty) {
    const diffColor =
      difficulty === 'easy' ? '#248A3D' : difficulty === 'medium' ? '#F4A340' : '#D94B45';
    return (
      <View style={[styles.pillBadge, { backgroundColor: `${diffColor}18` }, style]}>
        <Text
          style={[
            styles.pillBadgeText,
            { color: diffColor, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
            textStyle,
          ]}
        >
          {difficulty}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.pillBadge, style]}>
      <Text style={[styles.pillBadgeText, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  foodMarkBorder: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  foodMarkCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#6D28D9',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3EC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },
});
