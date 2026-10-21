import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClerk } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { client, setActive } = useClerk();
  const isLoaded = Boolean(client && setActive);

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Request password reset email code
  const handleRequestReset = async () => {
    if (!isLoaded || !client || !email.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await client.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      setStep('reset');
      setSuccessMessage(`Reset code sent to ${email.trim()}`);
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Unable to send reset code. Please verify your email.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit reset code and new password
  const handleResetPassword = async () => {
    if (!isLoaded || !client || !code.trim() || !newPassword.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await client.signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password: newPassword,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)/home');
      } else {
        console.log('Reset status:', result.status);
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Failed to reset password. Please check your code and password requirements.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => (step === 'reset' ? setStep('request') : router.back())}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={Colors.text.DEFAULT} />
            </Pressable>
          </View>

          {/* Header Brand Section */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={32} color={Colors.primary.DEFAULT} />
            </View>

            <Text style={styles.title}>
              {step === 'request' ? 'Forgot Password?' : 'Reset Your Password'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'request'
                ? 'Enter your registered email address to receive a secure password reset code.'
                : `Enter the 6-digit code sent to ${email} and choose a new password.`}
            </Text>
          </View>

          {/* Success Banner */}
          {successMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.error.DEFAULT} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.card}>
            {step === 'request' ? (
              <>
                <Input
                  label="Email Address"
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setErrorMessage(null);
                  }}
                  leftIcon={
                    <Ionicons
                      name="mail-outline"
                      size={19}
                      color={Colors.text.muted}
                    />
                  }
                />

                <View style={{ marginTop: 8 }}>
                  <Button
                    title="Send Reset Code"
                    onPress={handleRequestReset}
                    loading={isLoading}
                    disabled={!email.trim() || isLoading}
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />}
                  />
                </View>
              </>
            ) : (
              <>
                <Input
                  label="Verification Code"
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(t) => {
                    setCode(t);
                    setErrorMessage(null);
                  }}
                  leftIcon={
                    <Ionicons
                      name="key-outline"
                      size={19}
                      color={Colors.text.muted}
                    />
                  }
                />

                <Input
                  label="New Password"
                  placeholder="At least 8 characters"
                  isPassword
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    setErrorMessage(null);
                  }}
                  helperText="Must be at least 8 characters long"
                  leftIcon={
                    <Ionicons
                      name="lock-closed-outline"
                      size={19}
                      color={Colors.text.muted}
                    />
                  }
                />

                <View style={{ marginTop: 8 }}>
                  <Button
                    title="Update Password"
                    onPress={handleResetPassword}
                    loading={isLoading}
                    disabled={code.length < 4 || newPassword.length < 8 || isLoading}
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />}
                  />
                </View>
              </>
            )}
          </View>

          {/* Return to Sign In */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remembered your password? </Text>
            <Pressable
              onPress={() => router.push('/(auth)/sign-in')}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
              hitSlop={8}
            >
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  topBar: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECE8DF',
    shadowColor: '#245C45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4E7DC',
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.text.DEFAULT,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.muted,
    lineHeight: 22,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#EFECE4',
    shadowColor: '#245C45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#15803D',
    marginLeft: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8E8',
    borderColor: Colors.error.DEFAULT,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.error.DEFAULT,
    marginLeft: 8,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.muted,
  },
  footerLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary.DEFAULT,
  },
});
