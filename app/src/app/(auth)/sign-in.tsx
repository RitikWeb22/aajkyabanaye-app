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

const emailSignInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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

export default function SignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { client, setActive } = useClerk();
  const isLoaded = Boolean(client && setActive);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  const handleEmailSignIn = async () => {
    setServerError(null);

    const validation = emailSignInSchema.safeParse({
      email: email.trim(),
      password,
    });

    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === 'email') fieldErrors.email = issue.message;
        if (issue.path[0] === 'password') fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    if (!isLoaded || !client) return;

    setIsSubmitting(true);
    try {
      const result = await client.signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        setHasCompletedOnboarding(true);
        router.replace('/(tabs)/home');
      } else if (result.status === 'needs_first_factor') {
        const passwordFactor = (result.supportedFirstFactors as any[])?.find(
          (f) => f.strategy === 'password'
        );
        if (passwordFactor) {
          const res = await client.signIn.attemptFirstFactor({
            strategy: 'password',
            password,
          });
          if (res.status === 'complete' && res.createdSessionId) {
            await setActive({ session: res.createdSessionId });
            setHasCompletedOnboarding(true);
            router.replace('/(tabs)/home');
            return;
          }
        }
        setServerError('Please complete additional authentication step.');
      } else if (result.status === 'needs_second_factor') {
        setServerError('Two-factor verification is required for this account.');
      } else {
        setServerError(`Sign in status: ${result.status}. Please verify your credentials.`);
      }
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Unable to sign in. Please verify your email and password.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
      console.warn('Google sign-in:', err);
      setServerError(
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Google sign-in was cancelled or encountered an issue.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGuestContinue = () => {
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)/home');
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your culinary journey.</Text>
            </View>

            {/* Server Error Alert Banner */}
            {serverError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error.DEFAULT} />
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            {/* Form Fields: EMAIL LOGIN */}
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
                placeholder="Enter your password"
                isPassword
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
                containerStyle={{ marginBottom: 6 }}
                leftIcon={<Ionicons name="lock-closed-outline" size={19} color="#9CA3AF" />}
              />

              {/* Forgot Password Link */}
              <View style={styles.forgotRow}>
                <Pressable
                  onPress={() => router.push('/(auth)/forgot-password')}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                  hitSlop={8}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Sign In Primary Button */}
              <Pressable
                onPress={handleEmailSignIn}
                disabled={isSubmitting || isGoogleLoading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  isSubmitting && styles.primaryButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </Pressable>
            </View>

            {/* "or" Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with Google Button */}
            <Pressable
              onPress={handleGoogleSignIn}
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

            {/* Continue as Guest Link */}
            <View style={styles.guestRow}>
              <Pressable
                onPress={handleGuestContinue}
                style={({ pressed }) => [
                  styles.guestButton,
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Explore as guest"
              >
                <Text style={styles.guestButtonText}>Explore App as Guest</Text>
                <Ionicons name="arrow-forward" size={14} color="#1C4D38" style={{ marginLeft: 4 }} />
              </Pressable>
            </View>

            {/* Switch to Sign Up */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Pressable
                onPress={() => router.push('/(auth)/sign-up')}
                accessibilityRole="button"
                accessibilityLabel="Sign up for an account"
                hitSlop={8}
              >
                <Text style={styles.footerLink}>Sign Up</Text>
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
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 18,
    marginTop: 2,
  },
  forgotText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#1C4D38',
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
  guestRow: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  guestButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#1C4D38',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
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
