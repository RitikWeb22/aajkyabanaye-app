import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClerk } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAppStore } from '../../store/useAppStore';

export default function VerifyScreen() {
  const router = useRouter();
  const { email, phone, mode } = useLocalSearchParams<{
    email?: string;
    phone?: string;
    mode?: 'sign-in' | 'sign-up';
  }>();

  const isPhoneAuth = Boolean(phone);
  const identifierText = phone || email || 'your account';

  const { client, setActive } = useClerk();
  const isLoaded = Boolean(client && setActive);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (!isLoaded || !client || !code.trim()) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      if (isPhoneAuth) {
        if (mode === 'sign-in') {
          // Phone sign-in factor verification
          const signInAttempt = await client.signIn.attemptFirstFactor({
            strategy: 'phone_code',
            code: code.trim(),
          });

          if (signInAttempt.status === 'complete' && signInAttempt.createdSessionId) {
            await setActive({ session: signInAttempt.createdSessionId });
            setHasCompletedOnboarding(true);
            router.replace('/(tabs)/home');
            return;
          } else {
            setErrorMessage(`Sign in status: ${signInAttempt.status}. Please try again.`);
            return;
          }
        } else {
          // Phone sign-up verification
          const completeSignUp = await client.signUp.attemptPhoneNumberVerification({
            code: code.trim(),
          });

          if (completeSignUp.status === 'complete' && completeSignUp.createdSessionId) {
            await setActive({ session: completeSignUp.createdSessionId });
            setHasCompletedOnboarding(true);
            router.replace('/(tabs)/home');
            return;
          } else if (completeSignUp.status === 'missing_requirements') {
            const missing = (completeSignUp as any).missingFields || [];
            setErrorMessage(`Additional required fields: ${missing.join(', ')}.`);
            return;
          } else {
            setErrorMessage(`Verification status: ${completeSignUp.status}. Unable to complete registration.`);
            return;
          }
        }
      } else {
        // Email address verification
        const completeSignUp = await client.signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });

        if (completeSignUp.status === 'complete' && completeSignUp.createdSessionId) {
          await setActive({ session: completeSignUp.createdSessionId });
          setHasCompletedOnboarding(true);
          router.replace('/(tabs)/home');
          return;
        } else if (completeSignUp.status === 'missing_requirements') {
          const missing = (completeSignUp as any).missingFields || [];
          if (missing.includes('phone_number')) {
            setErrorMessage(
              'Phone number is currently required in your Clerk Dashboard. Go to Clerk Dashboard > User & Authentication > Phone and toggle off "Sign-up with phone number" to allow email-only registration.'
            );
          } else {
            setErrorMessage(`Additional required fields: ${missing.join(', ')}.`);
          }
          return;
        } else {
          setErrorMessage(`Verification status: ${completeSignUp.status}. Unable to complete registration.`);
          return;
        }
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Invalid verification code. Please check and try again.';
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded || !client || resendCooldown > 0) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      if (isPhoneAuth) {
        if (mode === 'sign-in') {
          const factor = (client.signIn.supportedFirstFactors as any[])?.find(
            (f) => f.strategy === 'phone_code'
          );
          if (factor) {
            await client.signIn.prepareFirstFactor({
              strategy: 'phone_code',
              phoneNumberId: factor.phoneNumberId,
            });
            setSuccessNotice('A new verification code has been sent via SMS.');
            setResendCooldown(30);
          } else {
            setErrorMessage('Unable to resend SMS code. Please try signing in again.');
          }
        } else {
          await client.signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
          setSuccessNotice('A new verification code has been sent via SMS.');
          setResendCooldown(30);
        }
      } else {
        await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setSuccessNotice('A new verification code has been sent to your email.');
        setResendCooldown(30);
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Failed to resend code. Please try again shortly.';
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
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
              onPress={() => router.back()}
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
              <Ionicons
                name={isPhoneAuth ? 'chatbubble-ellipses-outline' : 'mail-open-outline'}
                size={32}
                color={Colors.primary.DEFAULT}
              />
            </View>

            <Text style={styles.title}>
              {isPhoneAuth ? 'Verify Phone Number' : 'Verify Your Email'}
            </Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit confirmation code {isPhoneAuth ? 'via SMS ' : ''}to{' '}
              <Text style={styles.emailHighlight}>{identifierText}</Text>.
            </Text>
          </View>

          {/* Success Banner */}
          {successNotice && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <Text style={styles.successBannerText}>{successNotice}</Text>
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
            <Input
              label="6-Digit Verification Code"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(text) => {
                setCode(text);
                setErrorMessage(null);
              }}
              style={styles.otpInput}
              leftIcon={
                <Ionicons
                  name="key-outline"
                  size={19}
                  color={Colors.text.muted}
                />
              }
            />

            <View style={{ marginTop: 10 }}>
              <Button
                title="Verify & Continue"
                onPress={handleVerify}
                loading={isVerifying}
                disabled={code.length < 4 || isVerifying}
                variant="primary"
                size="lg"
                fullWidth
                icon={<Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />}
              />
            </View>
          </View>

          {/* Resend Action */}
          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
            <Pressable
              onPress={handleResend}
              disabled={resendCooldown > 0 || isResending}
              accessibilityRole="button"
              accessibilityLabel="Resend code"
              hitSlop={8}
            >
              <Text
                style={[
                  styles.resendLink,
                  resendCooldown > 0 && styles.resendDisabled,
                ]}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : isResending
                  ? 'Sending...'
                  : 'Resend Code'}
              </Text>
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
  emailHighlight: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text.DEFAULT,
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
  otpInput: {
    letterSpacing: 6,
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  resendPrompt: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.muted,
  },
  resendLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary.DEFAULT,
  },
  resendDisabled: {
    color: Colors.text.muted,
  },
});
