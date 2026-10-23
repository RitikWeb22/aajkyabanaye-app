import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Animated,
  PanResponder,
  Easing,
  Platform,
} from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';

interface SlideData {
  id: string;
  showLogo?: boolean;
  titleLine1: string;
  titleLine2: string;
  rayColor: string;
  subtitle: string;
  image: number | ImageSource;
}

const SLIDES: SlideData[] = [
  {
    id: '1',
    showLogo: true,
    titleLine1: 'Aaj kya',
    titleLine2: 'banega?',
    rayColor: '#F59E0B', // Saffron golden rays
    subtitle: 'Your AI-powered cooking assistant for easy, tasty and healthy meals.',
    image: require('../../assets/images/onboarding-1.png'),
  },
  {
    id: '2',
    showLogo: false,
    titleLine1: 'Cook with',
    titleLine2: 'what you have',
    rayColor: '#10B981', // Fresh herb green rays
    subtitle: "Tell us what's in your pantry, get personalized recipes instantly.",
    image: require('../../assets/images/onboarding-2.png'),
  },
  {
    id: '3',
    showLogo: false,
    titleLine1: 'Plan. Cook.',
    titleLine2: 'Get it Delivered.',
    rayColor: '#F59E0B', // Saffron golden rays
    subtitle: 'Save your meals, plan your week and get ingredients from Instamart with one tap.',
    image: require('../../assets/images/onboarding-3.png'),
  },
];

// Radiating sparkle rays component matching the reference design
function SparkleRays({ color }: { color: string }) {
  return (
    <View style={styles.raysContainer}>
      <View style={[styles.rayLine, styles.rayTop, { backgroundColor: color }]} />
      <View style={[styles.rayLine, styles.rayMid, { backgroundColor: color }]} />
      <View style={[styles.rayLine, styles.rayBot, { backgroundColor: color }]} />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const slideWidth = Math.min(windowWidth, 440);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  // Carousel Drag & Slide Animation
  const translateX = useRef(new Animated.Value(0)).current;
  const isDraggingRef = useRef(false);

  // Floating & Scale Animation for Hero Illustrations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const imageScaleAnim = useRef(new Animated.Value(1)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  // Continuous subtle breathing loop
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnim]);

  // Navigate to slide index
  const goToSlide = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(SLIDES.length - 1, index));
      setCurrentIndex(clampedIndex);
      Animated.spring(translateX, {
        toValue: -clampedIndex * slideWidth,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();

      imageScaleAnim.setValue(0.93);
      textFadeAnim.setValue(0.3);
      Animated.parallel([
        Animated.spring(imageScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [slideWidth, translateX, imageScaleAnim, textFadeAnim]
  );

  // PanResponder for finger and mouse swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return (
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2
        );
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
      },
      onPanResponderMove: (_, gesture) => {
        const baseOffset = -currentIndexRef.current * slideWidth;
        const isAtStart = currentIndexRef.current === 0 && gesture.dx > 0;
        const isAtEnd =
          currentIndexRef.current === SLIDES.length - 1 && gesture.dx < 0;
        const damp = isAtStart || isAtEnd ? 0.35 : 1;
        translateX.setValue(baseOffset + gesture.dx * damp);
      },
      onPanResponderRelease: (_, gesture) => {
        isDraggingRef.current = false;
        const threshold = slideWidth * 0.18;
        if (gesture.dx < -threshold && currentIndexRef.current < SLIDES.length - 1) {
          goToSlide(currentIndexRef.current + 1);
        } else if (gesture.dx > threshold && currentIndexRef.current > 0) {
          goToSlide(currentIndexRef.current - 1);
        } else {
          goToSlide(currentIndexRef.current);
        }
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        goToSlide(currentIndexRef.current);
      },
    })
  ).current;

  // Web keyboard navigation
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
          if (currentIndexRef.current < SLIDES.length - 1) {
            goToSlide(currentIndexRef.current + 1);
          }
        } else if (e.key === 'ArrowLeft') {
          if (currentIndexRef.current > 0) {
            goToSlide(currentIndexRef.current - 1);
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [goToSlide]);

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    router.replace('/(auth)/sign-in');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    }
  };

  const handleGetStarted = () => {
    setHasCompletedOnboarding(true);
    router.push('/(auth)/sign-up');
  };

  const handleSignIn = () => {
    setHasCompletedOnboarding(true);
    router.push('/(auth)/sign-in');
  };

  const handleGuest = () => {
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)/home');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  // Dynamic illustration max height based on available screen height
  const illustrationMaxHeight = Math.min(windowHeight * 0.44, 360);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { maxWidth: slideWidth }]}>
        {/* Top Header Row with Skip Button on Right */}
        <View style={styles.topHeaderRow}>
          <View style={styles.topHeaderLeftPlaceholder} />
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            hitSlop={12}
          >
            <Text style={styles.skipBtnText}>Skip</Text>
          </Pressable>
        </View>

        {/* Carousel & Swipe Track */}
        <View style={styles.carouselContainer} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.slidesTrack,
              {
                width: slideWidth * SLIDES.length,
                transform: [{ translateX }],
              },
            ]}
          >
            {SLIDES.map((slide, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <View
                  key={slide.id}
                  style={[styles.slideItem, { width: slideWidth }]}
                >
                  {/* Top Text Content Area */}
                  <Animated.View
                    style={[
                      styles.topContentGroup,
                      {
                        opacity: isCurrent ? textFadeAnim : 1,
                        paddingTop: slide.showLogo ? 0 : 12,
                      },
                    ]}
                  >
                    {/* Screen 1 Centered Brand Logo */}
                    {slide.showLogo && (
                      <View style={styles.brandLogoRow}>
                        <Image
                          source={require('../../assets/images/logo.png')}
                          style={styles.screenBrandLogo}
                          contentFit="contain"
                          priority="high"
                        />
                      </View>
                    )}

                    {/* Bold Organic Forest Green Title */}
                    <View style={styles.headingContainer}>
                      <Text style={styles.titleLine1}>{slide.titleLine1}</Text>
                      <View style={styles.titleLine2Row}>
                        <Text style={styles.titleLine2}>{slide.titleLine2}</Text>
                        <SparkleRays color={slide.rayColor} />
                      </View>
                    </View>

                    {/* Subtitle */}
                    <Text style={styles.subtitle}>{slide.subtitle}</Text>
                  </Animated.View>

                  {/* Centered Transparent Hero Illustration */}
                  <View style={styles.imageContainer}>
                    <Animated.View
                      style={[
                        styles.imageAnimatedWrapper,
                        {
                          transform: [
                            { translateY: floatAnim },
                            { scale: isCurrent ? imageScaleAnim : 1 },
                          ],
                        },
                      ]}
                    >
                      <Image
                        source={slide.image}
                        style={[
                          styles.heroIllustration,
                          { height: illustrationMaxHeight },
                        ]}
                        contentFit="contain"
                        priority="high"
                      />
                    </Animated.View>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        </View>

        {/* Bottom Navigation Area: Pagination Dots + Forest Green Button */}
        <View style={styles.bottomArea}>
          {/* Centered Pagination Dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, idx) => (
              <Pressable
                key={idx}
                onPress={() => goToSlide(idx)}
                style={[
                  styles.dot,
                  idx === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${idx + 1}`}
                hitSlop={8}
              />
            ))}
          </View>

          {/* Action Button */}
          {isLast ? (
            <View style={styles.lastActionContainer}>
              <Pressable
                onPress={handleGetStarted}
                style={({ pressed }) => [styles.mainButton, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Get Started"
              >
                <Text style={styles.mainButtonText}>Get Started</Text>
              </Pressable>

              <View style={styles.authLinksRow}>
                <Pressable onPress={handleSignIn} hitSlop={8}>
                  <Text style={styles.secondaryLinkText}>
                    Have an account? <Text style={styles.secondaryLinkBold}>Sign In</Text>
                  </Text>
                </Pressable>
                <Text style={styles.linkDotSeparator}>•</Text>
                <Pressable onPress={handleGuest} hitSlop={8}>
                  <Text style={styles.secondaryLinkText}>Guest Mode</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.mainButton, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Next slide"
            >
              <Text style={styles.mainButtonText}>Next →</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 8,
    paddingBottom: 2,
    zIndex: 10,
  },
  topHeaderLeftPlaceholder: {
    width: 48,
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#657368',
  },
  carouselContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  slidesTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  slideItem: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  topContentGroup: {
    alignItems: 'flex-start',
    width: '100%',
  },
  brandLogoRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  screenBrandLogo: {
    width: 130,
    height: 70,
  },
  headingContainer: {
    marginTop: 2,
  },
  titleLine1: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: '#0B3A2C',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  titleLine2Row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleLine2: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: '#0B3A2C',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  raysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    height: 28,
    width: 20,
    position: 'relative',
  },
  rayLine: {
    position: 'absolute',
    borderRadius: 2,
  },
  rayTop: {
    width: 12,
    height: 3,
    top: 4,
    left: 2,
    transform: [{ rotate: '-25deg' }],
  },
  rayMid: {
    width: 15,
    height: 3,
    top: 13,
    left: 4,
  },
  rayBot: {
    width: 12,
    height: 3,
    bottom: 4,
    left: 2,
    transform: [{ rotate: '25deg' }],
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#556358',
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 340,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  imageAnimatedWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIllustration: {
    width: '100%',
  },
  bottomArea: {
    paddingHorizontal: 26,
    paddingBottom: 24,
    paddingTop: 8,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 8,
    backgroundColor: '#0B3A2C',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#D1DAD4',
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
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  mainButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  lastActionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  authLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  secondaryLinkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#657368',
  },
  secondaryLinkBold: {
    fontFamily: 'Inter_600SemiBold',
    color: '#0B3A2C',
  },
  linkDotSeparator: {
    color: '#A0ACA3',
    fontSize: 12,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
