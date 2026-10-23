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

const emailSignUpSchema = z
  .object({
    fullName: z.string().min(1, 'Please enter your full name'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least 1 uppercase letter')
      .regex(/[0-9]/, 'Must include at least 1 number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreedToTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Terms of Service & Privacy Policy' }),
    }),
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

// Sparkle rays component matching the playful brand
function SparkleRays() {
  return (
    <View style={styles.raysContainer}>
      <View style={[styles.rayLine, styles.rayTop]} />
      <View style={[styles.rayLine, styles.rayMid]} />
      <View style={[styles.rayLine, styles.rayBot]} />
    </View>
  );
}

export default function SignUpScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, 440);

  const { client, setActive } = useClerk();
  const isLoaded = Boolean(client && setActive);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startGithubOAuth } = useOAuth({ strategy: 'oauth_github' });

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    agreedToTerms?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  const handleEmailSignUp = async () => {
    setServerError(null);

    const validation = emailSignUpSchema.safeParse({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      confirmPassword,
      agreedToTerms,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    if (!isLoaded || !client) return;

    setIsSubmitting(true);
    try {
      const names = fullName.trim().split(' ');
      const firstName = names[0] || 'Chef';
      const lastName = names.slice(1).join(' ') || undefined;

      await client.signUp.create({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName,
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

  const handleGithubSignUp = async () => {
    try {
      setIsGithubLoading(true);
      setServerError(null);
      const redirectUrl = Linking.createURL('/oauth-native-callback');
      const { createdSessionId, setActive: setOAuthActive } = await startGithubOAuth({
        redirectUrl,
      });
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        setHasCompletedOnboarding(true);
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      console.warn('GitHub sign-up:', err);
      setServerError(
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          'GitHub sign-up was cancelled or encountered an issue.'
      );
    } finally {
      setIsGithubLoading(false);
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
            {/* Top Navigation Row: Back Button on Left */}
            <View style={styles.topNavRow}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={24} color="#0B3A2C" />
              </Pressable>
            </View>

            {/* Centered Brand Header with Sparkle Rays & Tagline */}
            <View style={styles.brandCenterContainer}>
              <View style={styles.brandLogoRow}>
                <Image
                  source={require('../../../assets/images/logo-remove.png')}
                  style={styles.brandLogo}
                  contentFit="contain"
                  priority="high"
                />
                <SparkleRays />
              </View>
              <Text style={styles.brandTagline}>Aaj kya banega? Let's find out!</Text>
            </View>

            {/* Heading Section */}
            <View style={styles.headingSection}>
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.subtitle}>
                Join AajKyaBanaye and get personalized recipes, meal plans and more!
              </Text>
            </View>

            {/* Server Error Alert Banner */}
            {serverError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#991B1B" />
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Full Name */}
              <View style={styles.inputWrapper}>
                <View
                  style={[
                    styles.inputFieldBox,
                    errors.fullName && styles.inputFieldBoxError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#7A8B80"
                    style={styles.fieldLeftIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Full Name"
                    placeholderTextColor="#8C9890"
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val);
                      if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined }));
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                {errors.fullName && (
                  <Text style={styles.fieldErrorText}>{errors.fullName}</Text>
                )}
              </View>

              {/* Email Address */}
              <View style={styles.inputWrapper}>
                <View
                  style={[
                    styles.inputFieldBox,
                    errors.email && styles.inputFieldBoxError,
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
                    placeholder="Email Address"
                    placeholderTextColor="#8C9890"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
                {errors.email && (
                  <Text style={styles.fieldErrorText}>{errors.email}</Text>
                )}
              </View>

              {/* Phone Number (Optional) */}
              <View style={styles.inputWrapper}>
                <View
                  style={[
                    styles.inputFieldBox,
                    errors.phone && styles.inputFieldBoxError,
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="#7A8B80"
                    style={styles.fieldLeftIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Phone Number (Optional)"
                    placeholderTextColor="#8C9890"
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val);
                      if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                    }}
                    keyboardType="phone-pad"
                  />
                </View>
                {errors.phone && (
                  <Text style={styles.fieldErrorText}>{errors.phone}</Text>
                )}
              </View>

              {/* Password */}
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

              {/* Confirm Password */}
              <View style={styles.inputWrapper}>
                <View
                  style={[
                    styles.inputFieldBox,
                    errors.confirmPassword && styles.inputFieldBoxError,
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
                    placeholder="Confirm Password"
                    placeholderTextColor="#8C9890"
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (errors.confirmPassword)
                        setErrors((e) => ({ ...e, confirmPassword: undefined }));
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.fieldRightIconBtn}
                    hitSlop={10}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#7A8B80"
                    />
                  </Pressable>
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.fieldErrorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Terms of Service & Privacy Policy Agreement Checkbox */}
              <View style={styles.termsWrapper}>
                <Pressable
                  onPress={() => {
                    setAgreedToTerms(!agreedToTerms);
                    if (errors.agreedToTerms)
                      setErrors((e) => ({ ...e, agreedToTerms: undefined }));
                  }}
                  style={styles.termsCheckboxGroup}
                  hitSlop={6}
                >
                  <View
                    style={[
                      styles.checkbox,
                      agreedToTerms && styles.checkboxActive,
                    ]}
                  >
                    {agreedToTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </View>
                </Pressable>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => router.push('/privacy')}
                  >
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => router.push('/privacy')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
              {errors.agreedToTerms && (
                <Text style={[styles.fieldErrorText, { marginBottom: 12 }]}>
                  {errors.agreedToTerms}
                </Text>
              )}

              {/* Create Account Main CTA Button */}
              <Pressable
                onPress={handleEmailSignUp}
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
                    <Text style={styles.mainButtonText}>Create Account</Text>
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

            {/* Divider: "or sign up with" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social OAuth Buttons */}
            <View style={styles.socialRow}>
              {/* Google Button */}
              <Pressable
                onPress={handleGoogleSignUp}
                disabled={isGoogleLoading}
                style={({ pressed }) => [
                  styles.socialBtn,
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
                    <Text style={styles.socialBtnText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              {/* GitHub Button */}
              <Pressable
                onPress={handleGithubSignUp}
                disabled={isGithubLoading}
                style={({ pressed }) => [
                  styles.socialBtn,
                  pressed && styles.btnPressed,
                  isGithubLoading && { opacity: 0.8 },
                ]}
              >
                {isGithubLoading ? (
                  <ActivityIndicator size="small" color="#0B3A2C" />
                ) : (
                  <>
                    <Ionicons name="logo-github" size={20} color="#1E293B" />
                    <Text style={styles.socialBtnText}>Continue with GitHub</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Footer Navigation Link: "Already have an account? Log In" */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text
                  style={styles.footerLink}
                  onPress={() => router.push('/(auth)/sign-in')}
                >
                  Log In
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
    paddingTop: 8,
    paddingBottom: 36,
    alignItems: 'center',
    position: 'relative',
  },
  mainContainer: {
    width: '100%',
    zIndex: 2,
  },
  topNavRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backBtn: {
    padding: 6,
    marginLeft: -6,
  },
  brandCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 2,
    marginBottom: 10,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 155,
    height: 80,
  },
  raysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    height: 28,
    width: 18,
    position: 'relative',
  },
  rayLine: {
    position: 'absolute',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  rayTop: {
    width: 11,
    height: 3,
    top: 4,
    left: 2,
    transform: [{ rotate: '-25deg' }],
  },
  rayMid: {
    width: 14,
    height: 3,
    top: 13,
    left: 3,
  },
  rayBot: {
    width: 11,
    height: 3,
    bottom: 4,
    left: 2,
    transform: [{ rotate: '25deg' }],
  },
  brandTagline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#265945',
    marginTop: 2,
  },
  headingSection: {
    marginTop: 12,
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: '#0B3A2C',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#556358',
    marginTop: 4,
    lineHeight: 20,
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
    marginBottom: 12,
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
  termsWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 2,
    gap: 10,
  },
  termsCheckboxGroup: {
    paddingTop: 2,
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
  termsText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#3B4D42',
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: 'Inter_600SemiBold',
    color: '#0B3A2C',
    textDecorationLine: 'underline',
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
    marginVertical: 20,
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
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E6E0D2',
    borderRadius: 16,
    height: 50,
    gap: 8,
    shadowColor: '#0B3A2C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  socialBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#22382D',
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
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
