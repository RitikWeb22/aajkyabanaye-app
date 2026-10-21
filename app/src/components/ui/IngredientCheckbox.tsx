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

export interface IngredientCheckboxProps {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  checked: boolean;
  alreadyHave?: boolean;
  onToggleCheck: (id: string) => void;
  onToggleAlreadyHave?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function IngredientCheckbox({
  id,
  name,
  quantity,
  unit,
  checked,
  alreadyHave = false,
  onToggleCheck,
  onToggleAlreadyHave,
  style,
}: IngredientCheckboxProps) {
  const formatQuantity = () => {
    if (typeof quantity !== 'number' || quantity === 0) return '';
    return `${quantity} ${unit || ''}`.trim();
  };

  return (
    <View style={[styles.container, alreadyHave && styles.containerHave, style]}>
      {/* Checkbox & Item Name */}
      <Pressable
        onPress={() => onToggleCheck(id)}
        style={styles.mainClickable}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${name}, ${formatQuantity()}`}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
        </View>

        <View style={styles.infoWrapper}>
          <Text style={[styles.name, alreadyHave && styles.nameMuted]}>{name}</Text>
          {formatQuantity() ? (
            <Text style={styles.quantityText}>{formatQuantity()}</Text>
          ) : null}
        </View>
      </Pressable>

      {/* Already Have Toggle */}
      {onToggleAlreadyHave && (
        <Pressable
          onPress={() => onToggleAlreadyHave(id)}
          style={[styles.havePill, alreadyHave && styles.havePillActive]}
          accessibilityRole="button"
          accessibilityLabel={alreadyHave ? 'Mark as needed' : 'Mark as already have'}
        >
          <Ionicons
            name={alreadyHave ? 'checkmark-circle' : 'home-outline'}
            size={13}
            color={alreadyHave ? '#248A3D' : Colors.text.muted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.haveText, alreadyHave && styles.haveTextActive]}>
            {alreadyHave ? 'In kitchen' : 'Have it'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    marginBottom: 8,
  },
  containerHave: {
    backgroundColor: '#F7F6F2',
    borderColor: '#ECEAE2',
  },
  mainClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
    minHeight: 36,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  infoWrapper: {
    flex: 1,
  },
  name: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text.DEFAULT,
  },
  nameMuted: {
    color: Colors.text.muted,
  },
  quantityText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  havePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F0ECE1',
  },
  havePillActive: {
    backgroundColor: '#E8F5E9',
  },
  haveText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.text.muted,
  },
  haveTextActive: {
    color: '#248A3D',
    fontFamily: 'Inter_600SemiBold',
  },
});
