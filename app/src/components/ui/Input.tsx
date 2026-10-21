import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  TextInputProps,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    isPassword = false,
    containerStyle,
    style,
    editable = true,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const internalRef = useRef<TextInput>(null);

  React.useImperativeHandle(ref, () => internalRef.current as TextInput);

  const hasError = Boolean(error);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        // On Web, className="web-input-container" applies CSS :focus-within styling
        // without triggering React state updates that cause focus-switching loops!
        {...(Platform.OS === 'web' ? { className: 'web-input-container' } : {})}
        style={[
          styles.inputContainer,
          hasError && styles.errorBorder,
          !editable && styles.disabledContainer,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          ref={internalRef}
          {...rest}
          editable={editable}
          secureTextEntry={isPassword && !showPassword}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholderTextColor="#8E9891"
          selectionColor="#1E5038"
          style={[
            styles.input,
            Platform.OS === 'web' && ({ outline: 'none' } as any),
            style,
          ]}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeIconContainer}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={12}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#8E9891"
            />
          </Pressable>
        ) : (
          rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>
        )}
      </View>

      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#16281E',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E4DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#16281E',
    paddingVertical: 12,
  },
  errorBorder: {
    borderColor: Colors.error.DEFAULT,
  },
  disabledContainer: {
    backgroundColor: '#F3F2EE',
  },
  leftIconContainer: {
    marginRight: 10,
    justifyContent: 'center',
  },
  rightIconContainer: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  eyeIconContainer: {
    padding: 6,
    marginLeft: 4,
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.error.DEFAULT,
    marginTop: 4,
  },
  helperText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 4,
  },
});
