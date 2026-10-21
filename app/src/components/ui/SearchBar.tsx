import React from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onSubmitEditing?: () => void;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  onFocus?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'What do you want to cook?',
  onClear,
  onSubmitEditing,
  onFilterPress,
  hasActiveFilters = false,
  style,
  autoFocus = false,
  onFocus,
}: SearchBarProps) {
  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputWrapper}>
        <Ionicons
          name="search-outline"
          size={20}
          color={Colors.primary.DEFAULT}
          style={styles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="search"
          autoFocus={autoFocus}
          onFocus={onFocus}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
          >
            <Ionicons name="close-circle" size={18} color={Colors.text.muted} />
          </Pressable>
        )}
      </View>

      {onFilterPress && (
        <Pressable
          onPress={onFilterPress}
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters ? '#FFFFFF' : Colors.primary.DEFAULT}
          />
          {hasActiveFilters && <View style={styles.activeDot} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text.DEFAULT,
    height: '100%',
  },
  clearButton: {
    padding: 6,
    marginLeft: 4,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  activeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent.DEFAULT,
  },
});
