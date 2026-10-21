import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unitLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  unitLabel,
  style,
}: QuantityStepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={handleDecrement}
        disabled={!canDecrement}
        style={({ pressed }) => [
          styles.btn,
          !canDecrement && styles.btnDisabled,
          pressed && canDecrement && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons
          name="remove"
          size={18}
          color={canDecrement ? Colors.primary.DEFAULT : Colors.disabled.DEFAULT}
        />
      </Pressable>

      <View style={styles.valueWrapper}>
        <Text style={styles.valueText}>{value}</Text>
        {unitLabel ? <Text style={styles.unitText}>{unitLabel}</Text> : null}
      </View>

      <Pressable
        onPress={handleIncrement}
        disabled={!canIncrement}
        style={({ pressed }) => [
          styles.btn,
          !canIncrement && styles.btnDisabled,
          pressed && canIncrement && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
      >
        <Ionicons
          name="add"
          size={18}
          color={canIncrement ? Colors.primary.DEFAULT : Colors.disabled.DEFAULT}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3EC',
    borderRadius: 20,
    padding: 4,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  btnDisabled: {
    backgroundColor: '#EBE9E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  valueWrapper: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  valueText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text.DEFAULT,
  },
  unitText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: -2,
  },
});
