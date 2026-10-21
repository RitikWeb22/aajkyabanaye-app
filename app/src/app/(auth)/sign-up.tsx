import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClerk, useOAuth } from '@clerk/expo';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { Colors } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { useAppStore } from '../../store/useAppStore';

const emailSignUpSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least 1 uppercase letter')
      .regex(/[a-z]/, 'Must include at least 1 lowercase letter')
      .regex(/[0-9]/, 'Must include at least 1 number')
      .regex(/[^A-Za-z0-9]/, 'Must include at least 1 special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignUpScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { client, setActive } = useClerk();
  const isLoaded = Boolean(client && setActive);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  const handleEmailSignUp = async () => {
    setServerError(null);

    // Validate inputs with Zod
    const validation = emailSignUpSchema.safeParse({
      email: email.trim(),
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string; confirmPassword?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === 'email') fieldErrors.email = issue.message;
        if (issue.path[0] === 'password') fieldErrors.password = issue.message;
        if (issue.path[0] === 'confirmPassword') fieldErrors.confirmPassword = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    if (!isLoaded || !client) return;

    setIsSubmitting(true);
    try {
      await client.signUp.create({
        emailAddress: email.trim(),
        password,
      });

      // Prepare email verification code
      await client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // Navigate to OTP verification screen
      router.push({
        pathname: '/(auth)/verify',
        params: { email: email.trim(), mode: 'sign-up' },
      });
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Unable to create account. Please check your details.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      setServerError(null);
      const redirectUrl = Linking.createURL('/oauth-native-callback');
      const { createdSessionId, setActive: setOAuthActive } = await startGoogleOAuth({
        redirectUrl,
      });
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        setHasCompletedOnboarding(true);
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      console.warn('Google sign-up:', err);
      setServerError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Google sign-up was cancelled or encountered an issue.'
      );
    } finally {
      setIsGoogleLoading(false);
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
          bounces={false}
        >
          {/* Centered Phone/Web Responsive Container */}
          <View style={styles.contentContainer}>
            {/* Top-Right Organic Pastel Sage Green Blob */}
            <View style={styles.topRightShape} pointerEvents="none" />

            {/* Centered Brand Header */}
            <View style={styles.brandRow}>
              <Image
                source={require('../../../assets/images/pot-icon.png')}
                style={styles.potLogo}
                contentFit="contain"
              />
              <View style={styles.brandTextContainer}>
                <Text style={styles.brandTitle}>
                  <Text style={styles.brandTitleGreen}>AajKya</Text>
                  <Text style={styles.brandTitleOrange}>Banaye</Text>
                </Text>
                <Text style={styles.brandTagline}>Aaj kya banega? Let's find out!</Text>
              </View>
            </View>

            {/* Headline Section */}
            <View style={styles.headingSection}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join thousands of food lovers cooking better every day.
              </Text>
            </View>

            {/* Server Error Alert Banner */}
            {serverError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error.DEFAULT} />
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            {/* Form Fields: EMAIL SIGN UP */}
            <View style={styles.formSection}>
              {/* Email Address Field */}
              <Input
                label="Email Address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
                containerStyle={styles.inputSpacing}
                leftIcon={<Ionicons name="mail-outline" size={19} color="#9CA3AF" />}
              />

              {/* Password Field */}
              <Input
                label="Password"
                placeholder="Create a secure password"
                isPassword
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
                helperText="At least 8 chars with uppercase, lowercase, number & symbol"
                containerStyle={styles.inputSpacing}
                leftIcon={<Ionicons name="lock-closed-outline" size={19} color="#9CA3AF" />}
              />

              {/* Confirm Password Field */}
              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                isPassword
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                error={errors.confirmPassword}
                containerStyle={{ marginBottom: 14 }}
                leftIcon={<Ionicons name="lock-closed-outline" size={19} color="#9CA3AF" />}
              />

              {/* Sign Up Primary Button */}
              <Pressable
                onPress={handleEmailSignUp}
                disabled={isSubmitting || isGoogleLoading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  isSubmitting && styles.primaryButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create Account"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </Pressable>
            </View>

            {/* Terms of Service & Privacy Policy Notice */}
            <View style={styles.legalNoticeContainer}>
              <Text style={styles.legalNoticeText}>
                By signing up, you agree to our{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => router.push('/terms')}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => router.push('/privacy')}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

            {/* "or" Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with Google Button */}
            <Pressable
              onPress={handleGoogleSignUp}
              disabled={isSubmitting || isGoogleLoading}
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.googleButtonPressed,
                isGoogleLoading && styles.googleButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#EA4335" />
              ) : (
                <>
                  <Image
                    source={require('../../../assets/images/google-icon.png')}
                    style={styles.googleIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            {/* Switch to Sign In */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable
                onPress={() => router.push('/(auth)/sign-in')}
                accessibilityRole="button"
                accessibilityLabel="Sign in to your account"
                hitSlop={8}
              >
                <Text style={styles.footerLink}>Sign In</Text>
              </Pressable>
            </View>
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
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#FFF9F0',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 420,
    position: 'relative',
  },
  topRightShape: {
    position: 'absolute',
    top: -30,
    right: -25,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E8EFE9',
    opacity: 0.85,
    zIndex: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 1,
  },
  potLogo: {
    width: 44,
    height: 42,
    marginRight: 10,
  },
  brandTextContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  brandTitleGreen: {
    color: '#1C4D38',
  },
  brandTitleOrange: {
    color: '#F4A340',
  },
  brandTagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#77827A',
    marginTop: 2,
  },
  headingSection: {
    marginBottom: 20,
    zIndex: 1,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: '#16281E',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#65736A',
    marginTop: 4,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  formSection: {
    marginBottom: 6,
  },
  inputSpacing: {
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#1C4D38',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C4D38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  primaryButtonPressed: {
    backgroundColor: '#143828',
    transform: [{ scale: 0.99 }],
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  legalNoticeContainer: {
    marginTop: 14,
    paddingHorizontal: 4,
  },
  legalNoticeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#758077',
    textAlign: 'center',
    lineHeight: 17,
  },
  legalLink: {
    color: '#1C4D38',
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4DFD3',
  },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#9CA3AF',
    paddingHorizontal: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DFD3',
    borderRadius: 14,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  googleButtonPressed: {
    backgroundColor: '#F9F8F5',
  },
  googleButtonDisabled: {
    opacity: 0.65,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#374151',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#65736A',
  },
  footerLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#1C4D38',
  },
});
