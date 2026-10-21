import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function Rating({ value, count, size = 'sm', style }: RatingProps) {
  const isSm = size === 'sm';
  const starSize = isSm ? 13 : 16;

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="star" size={starSize} color={Colors.accent.DEFAULT} style={styles.star} />
      <Text style={[styles.valueText, isSm ? styles.valueSm : styles.valueMd]}>
        {value.toFixed(1)}
      </Text>
      {typeof count === 'number' && (
        <Text style={[styles.countText, isSm ? styles.countSm : styles.countMd]}>
          ({count})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 4,
  },
  valueText: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text.DEFAULT,
  },
  valueSm: {
    fontSize: 12,
  },
  valueMd: {
    fontSize: 14,
  },
  countText: {
    fontFamily: 'Inter_400Regular',
    color: Colors.text.muted,
    marginLeft: 3,
  },
  countSm: {
    fontSize: 11,
  },
  countMd: {
    fontSize: 13,
  },
});
