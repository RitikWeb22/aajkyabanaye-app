import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClerk, useOAuth } from '@clerk/expo';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { useAppStore } from '../../store/useAppStore';

const emailSignInSchema = z.object({
  identifier: z.string().min(1, 'Please enter your email or phone number'),
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
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, 440);

  const { client, setActive } = useClerk();
  const isLoaded = Boolean(client && setActive);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [errors, setErrors] = useState<{
    identifier?: string;
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
      identifier: identifier.trim(),
      password,
    });

    if (!validation.success) {
      const fieldErrors: { identifier?: string; password?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === 'identifier') fieldErrors.identifier = issue.message;
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
        identifier: identifier.trim(),
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
        setServerError('Please complete the verification step.');
      } else {
        setServerError('Unable to sign in. Please check your credentials.');
      }
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Unable to sign in. Please verify your credentials.';
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
          <View style={[styles.mainContainer, { maxWidth: contentWidth }]}>
            {/* Top Row: Brand Logo on Left & Large Food Platter Banner-1 on Right */}
            <View style={styles.headerRow}>
              {/* Brand Logo & Tagline */}
              <View style={styles.brandGroup}>
                <Image
                  source={require('../../../assets/images/logo-remove.png')}
                  style={styles.brandLogo}
                  contentFit="contain"
                  priority="high"
                />
                <Text style={styles.brandTagline}>Aaj kya banega? Let's find out!</Text>
              </View>

              {/* Large Food Platter Banner-1 on top-right */}
              <View style={styles.foodBannerWrapper} pointerEvents="none">
                <Image
                  source={require('../../../assets/images/banner-1.png')}
                  style={styles.foodBannerImage}
                  contentFit="contain"
                  priority="high"
                />
              </View>
            </View>

            {/* Heading Section */}
            <View style={styles.headingSection}>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>
                Log in to continue your cooking journey with AajKyaBanaye.
              </Text>
            </View>

            {/* Server Error Alert Banner */}
            {serverError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#991B1B" />
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            {/* Input Form Fields */}
            <View style={styles.formContainer}>
              {/* Email or Phone Input */}
              <View style={styles.inputWrapper}>
                <View
                  style={[
                    styles.inputFieldBox,
                    errors.identifier && styles.inputFieldBoxError,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#7A8B80"
                    style={styles.fieldLeftIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email or Phone Number"
                    placeholderTextColor="#8C9890"
                    value={identifier}
                    onChangeText={(val) => {
                      setIdentifier(val);
                      if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
                {errors.identifier && (
                  <Text style={styles.fieldErrorText}>{errors.identifier}</Text>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <View
                  style={[
                    styles.inputFieldBox,
                    errors.password && styles.inputFieldBoxError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#7A8B80"
                    style={styles.fieldLeftIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Password"
                    placeholderTextColor="#8C9890"
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.fieldRightIconBtn}
                    hitSlop={10}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#7A8B80"
                    />
                  </Pressable>
                </View>
                {errors.password && (
                  <Text style={styles.fieldErrorText}>{errors.password}</Text>
                )}
              </View>

              {/* Remember Me & Forgot Password Row */}
              <View style={styles.optionsRow}>
                <Pressable
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.rememberMeGroup}
                  hitSlop={6}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxActive,
                    ]}
                  >
                    {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(auth)/forgot-password')}
                  hitSlop={6}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Log In Main CTA Button */}
              <Pressable
                onPress={handleEmailSignIn}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.mainButton,
                  pressed && styles.btnPressed,
                  isSubmitting && { opacity: 0.8 },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.mainButtonText}>Log In</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                )}
              </Pressable>
            </View>

            {/* Divider: "or continue with" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Full Width Google OAuth Button (GitHub removed) */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading}
              style={({ pressed }) => [
                styles.googleFullBtn,
                pressed && styles.btnPressed,
                isGoogleLoading && { opacity: 0.8 },
              ]}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#0B3A2C" />
              ) : (
                <>
                  <Image
                    source={require('../../../assets/images/google-icon.png')}
                    style={styles.googleIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            {/* Footer Navigation Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Text
                  style={styles.footerLink}
                  onPress={() => router.push('/(auth)/sign-up')}
                >
                  Sign Up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Decorative Bottom Botanical Leaf Sprig */}
        <View style={styles.bottomLeaves} pointerEvents="none">
          <Ionicons
            name="leaf"
            size={28}
            color="#2F7A4D"
            style={{ transform: [{ rotate: '35deg' }] }}
          />
          <Ionicons
            name="leaf"
            size={18}
            color="#469363"
            style={{ transform: [{ rotate: '-18deg' }], marginTop: -8, marginLeft: 12 }}
          />
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
    position: 'relative',
  },
  mainContainer: {
    width: '100%',
    zIndex: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    minHeight: 140,
    position: 'relative',
    marginBottom: 8,
  },
  brandGroup: {
    alignItems: 'flex-start',
    paddingTop: 8,
    zIndex: 2,
  },
  brandLogo: {
    width: 155,
    height: 82,
  },
  brandTagline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#265945',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  foodBannerWrapper: {
    position: 'absolute',
    top: -15,
    right: -24,
    width: 215,
    height: 155,
    zIndex: 1,
  },
  foodBannerImage: {
    width: '100%',
    height: '100%',
  },
  headingSection: {
    marginTop: 14,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    color: '#0B3A2C',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#556358',
    marginTop: 4,
    lineHeight: 21,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
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
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 14,
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E6E0D2',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 14,
    shadowColor: '#0B3A2C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inputFieldBoxError: {
    borderColor: '#EF4444',
  },
  fieldLeftIcon: {
    marginRight: 10,
  },
  fieldRightIconBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14.5,
    color: '#16281E',
    height: '100%',
  },
  fieldErrorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  rememberMeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C7D2CA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0B3A2C',
    borderColor: '#0B3A2C',
  },
  rememberMeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
    color: '#2E4236',
    marginLeft: 8,
  },
  forgotPasswordText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#0B3A2C',
  },
  mainButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0B3A2C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B3A2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4DDD0',
  },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#7C8B80',
    marginHorizontal: 12,
  },
  googleFullBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E6E0D2',
    borderRadius: 16,
    height: 52,
    gap: 10,
    shadowColor: '#0B3A2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14.5,
    color: '#22382D',
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#556358',
  },
  footerLink: {
    fontFamily: 'Inter_600SemiBold',
    color: '#0B3A2C',
  },
  bottomLeaves: {
    position: 'absolute',
    bottom: 12,
    right: 18,
    zIndex: 1,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
