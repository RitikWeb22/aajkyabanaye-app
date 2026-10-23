import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { Colors } from '../constants/theme';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';

export default function IndexScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle gentle breathing/floating loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    return () => floatLoop.stop();
  }, [scaleAnim, opacityAnim, floatAnim]);

  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      if (isSignedIn || hasCompletedOnboarding) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding, isSignedIn, isLoaded, router]);

  const handleManualNavigate = () => {
    if (isSignedIn || hasCompletedOnboarding) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable style={styles.container} onPress={handleManualNavigate}>
        {/* Soft Warm Radial Backdrop Glow */}
        <View style={styles.glowCircle} pointerEvents="none" />

        {/* Brand Mascot & Logo Showcase */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
            },
          ]}
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.heroLogo}
            contentFit="contain"
            transition={300}
          />
        </Animated.View>

        {/* Brand Tagline & Subtitle */}
        <Animated.View style={[styles.textContainer, { opacity: opacityAnim }]}>
          <View style={styles.badgeRow}>
            <Ionicons name="sparkles" size={13} color="#D97706" />
            <Text style={styles.badgeText}>SMART KITCHEN ASSISTANT</Text>
          </View>
          <Text style={styles.tagline}>Aaj kya banega? Let's find out!</Text>
          <Text style={styles.splashLine}>Your personalized AI recipes, pantry & meal planner.</Text>
        </Animated.View>

        {/* Fast Action CTA */}
        <Animated.View style={[styles.actionWrapper, { opacity: opacityAnim }]}>
          <Button
            title="Let's Cook"
            onPress={handleManualNavigate}
            variant="primary"
            size="lg"
            fullWidth
            icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            iconPosition="right"
          />
        </Animated.View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(235, 171, 56, 0.12)',
    top: '20%',
    alignSelf: 'center',
  },
  logoContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroLogo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#B45309',
    letterSpacing: 0.8,
  },
  tagline: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#1E3A2F',
    textAlign: 'center',
  },
  splashLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
  },
  actionWrapper: {
    width: '100%',
    maxWidth: 320,
  },
});
