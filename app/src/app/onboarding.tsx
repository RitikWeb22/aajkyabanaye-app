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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';

interface SlideData {
  id: string;
  titlePart1: string;
  titleAccent: string;
  subtitle: string;
  image: number | ImageSource;
}

const SLIDES: SlideData[] = [
  {
    id: '1',
    titlePart1: 'Your Ingredients,',
    titleAccent: 'Your Recipes',
    subtitle: 'Select the ingredients you have and discover what you can cook.',
    image: require('../../assets/images/onboarding-1.png'),
  },
  {
    id: '2',
    titlePart1: 'Tailor Portions,',
    titleAccent: 'Smart Chef Tools',
    subtitle: 'Scale servings proportionally and customize recipes to your kitchen taste.',
    image: require('../../assets/images/onboarding-2.png'),
  },
  {
    id: '3',
    titlePart1: 'Shop Only What',
    titleAccent: 'You Lack',
    subtitle: 'Export curated checklists for missing items with zero duplicate buying.',
    image: require('../../assets/images/onboarding-3.png'),
  },
];

// Radiating saffron sparkle rays component matching the reference design
function SaffronRays() {
  return (
    <View style={styles.raysContainer}>
      <View style={[styles.rayLine, styles.rayTop]} />
      <View style={[styles.rayLine, styles.rayMid]} />
      <View style={[styles.rayLine, styles.rayBot]} />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // Constrain width for tablet/desktop web preview to look like a mobile device frame or responsive container
  const slideWidth = Math.min(windowWidth, 480);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  // --- Typewriter State for Text Typing Animation ---
  const [typedPart1, setTypedPart1] = useState('');
  const [typedAccent, setTypedAccent] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const subtitleFadeAnim = useRef(new Animated.Value(0)).current;

  // --- Carousel Drag & Slide Animation ---
  const translateX = useRef(new Animated.Value(0)).current;
  const isDraggingRef = useRef(false);

  // --- Continuous Floating / Hovering Animation for 3D Hero Image ---
  const floatAnim = useRef(new Animated.Value(0)).current;
  const imageScaleAnim = useRef(new Animated.Value(1)).current;
  const imageFadeAnim = useRef(new Animated.Value(1)).current;

  // Start continuous subtle floating animation
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -7,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 7,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnim]);

  // Navigate to target slide index with smooth animated slide
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

      // Trigger pop/scale entrance animation for image
      imageScaleAnim.setValue(0.92);
      imageFadeAnim.setValue(0.4);
      Animated.parallel([
        Animated.spring(imageScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(imageFadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [slideWidth, translateX, imageScaleAnim, imageFadeAnim]
  );

  // --- Typewriter Effect Triggered on Slide Change ---
  useEffect(() => {
    const currentSlide = SLIDES[currentIndex];
    const fullPart1 = currentSlide.titlePart1;
    const fullAccent = currentSlide.titleAccent;

    setTypedPart1('');
    setTypedAccent('');
    setIsTypingComplete(false);
    subtitleFadeAnim.setValue(0);

    let charIdx = 0;
    const totalChars = fullPart1.length + fullAccent.length;
    const typingInterval = setInterval(() => {
      charIdx++;
      if (charIdx <= fullPart1.length) {
        setTypedPart1(fullPart1.slice(0, charIdx));
      } else {
        setTypedPart1(fullPart1);
        const accentChars = charIdx - fullPart1.length;
        setTypedAccent(fullAccent.slice(0, accentChars));
      }

      if (charIdx >= totalChars) {
        clearInterval(typingInterval);
        setIsTypingComplete(true);
        Animated.timing(subtitleFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }, 28);

    return () => clearInterval(typingInterval);
  }, [currentIndex, subtitleFadeAnim]);

  // --- PanResponder for Universal Touch and Mouse Drag Swiping ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only claim gesture if horizontal movement is dominant and > 12px
        return (
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2
        );
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
      },
      onPanResponderMove: (_, gesture) => {
        // Track finger / mouse with rubber-band effect at edges
        const baseOffset = -currentIndexRef.current * slideWidth;
        const isAtStart = currentIndexRef.current === 0 && gesture.dx > 0;
        const isAtEnd =
          currentIndexRef.current === SLIDES.length - 1 && gesture.dx < 0;
        const damp = isAtStart || isAtEnd ? 0.35 : 1;
        translateX.setValue(baseOffset + gesture.dx * damp);
      },
      onPanResponderRelease: (_, gesture) => {
        isDraggingRef.current = false;
        const threshold = slideWidth * 0.18; // Swipe threshold ~ 18% of screen width
        if (gesture.dx < -threshold && currentIndexRef.current < SLIDES.length - 1) {
          goToSlide(currentIndexRef.current + 1);
        } else if (gesture.dx > threshold && currentIndexRef.current > 0) {
          goToSlide(currentIndexRef.current - 1);
        } else {
          // Snap back to current slide
          goToSlide(currentIndexRef.current);
        }
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        goToSlide(currentIndexRef.current);
      },
    })
  ).current;

  // Web keyboard navigation (Left/Right Arrow keys)
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

  const handleSignUp = () => {
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

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Background Decorative Botanical Leaf Sprigs */}
      <View style={styles.topRightDeco} pointerEvents="none">
        <Ionicons name="leaf" size={48} color="rgba(114, 166, 122, 0.28)" />
      </View>
      <View style={styles.bottomLeftDeco} pointerEvents="none">
        <Ionicons name="leaf" size={42} color="rgba(114, 166, 122, 0.22)" />
      </View>

      <View style={[styles.mainContainer, { maxWidth: slideWidth }]}>
        {/* Top Brand Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/navbar-logo.png')}
            style={styles.logoIcon}
            contentFit="contain"
          />
          <View style={styles.headerTextGroup}>
            <Text style={styles.brandTitle}>
              AajKya<Text style={{ color: Colors.accent.DEFAULT }}>Banaye</Text>
            </Text>
            <Text style={styles.brandTagline}>Aaj kya banega? Let's find out!</Text>
          </View>
        </View>

        {/* Carousel & Swipe Gesture Surface */}
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
                  {/* Left-Aligned Headline with Typewriter Typing Effect */}
                  <View style={styles.textContainer}>
                    <Text style={styles.titleLine1}>
                      {isCurrent ? typedPart1 : slide.titlePart1}
                    </Text>

                    <View style={styles.titleLine2Row}>
                      <Text style={styles.titleLine2}>
                        {isCurrent ? typedAccent : slide.titleAccent}
                      </Text>
                      {/* Radiating Saffron Sparkle Rays beside the second title phrase */}
                      {(isCurrent ? isTypingComplete : true) && <SaffronRays />}
                      {/* Active typing blinking cursor */}
                      {isCurrent && !isTypingComplete && (
                        <Text style={styles.cursorBlink}>|</Text>
                      )}
                    </View>

                    {/* Subtitle with Smooth Animated Fade-In */}
                    <Animated.View
                      style={{
                        opacity: isCurrent ? subtitleFadeAnim : 1,
                        transform: [
                          {
                            translateY: isCurrent
                              ? subtitleFadeAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [6, 0],
                                })
                              : 0,
                          },
                        ],
                      }}
                    >
                      <Text style={styles.subtitle}>{slide.subtitle}</Text>
                    </Animated.View>
                  </View>

                  {/* 3D Floating Hero Illustration with Transparent Background */}
                  <View style={styles.imageContainer}>
                    <Animated.View
                      style={[
                        styles.imageAnimatedWrapper,
                        {
                          transform: [
                            { translateY: floatAnim },
                            { scale: isCurrent ? imageScaleAnim : 1 },
                          ],
                          opacity: isCurrent ? imageFadeAnim : 1,
                        },
                      ]}
                    >
                      <Image
                        source={slide.image}
                        style={[
                          styles.heroImage,
                          {
                            height: Math.min(windowHeight * (isLast ? 0.38 : 0.44), isLast ? 360 : 420),
                          },
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

        {/* Bottom Navigation & Authentication Bar */}
        {isLast ? (
          <View style={styles.lastSlideBottomContainer}>
            {/* Centered Pagination Indicators */}
            <View style={styles.lastDotsGroup}>
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
                />
              ))}
            </View>

            {/* Authentication Action Buttons */}
            <View style={styles.authButtonsWrapper}>
              <Button
                title="Create Account"
                onPress={handleSignUp}
                variant="primary"
                size="lg"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
                iconPosition="right"
              />

              <View style={{ height: 10 }} />

              <Button
                title="Sign In to Existing Account"
                onPress={handleSignIn}
                variant="outline"
                size="lg"
                fullWidth
              />

              <Pressable
                onPress={handleGuest}
                style={styles.guestLinkWrapper}
                accessibilityRole="button"
                accessibilityLabel="Continue as guest"
              >
                <Text style={styles.guestLinkText}>Or continue as Guest →</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.bottomBar}>
            {/* Skip Button on Left -> Navigates to Authentication */}
            <Pressable
              onPress={handleSkip}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel="Skip to sign in"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            {/* Centered Pagination Indicators */}
            <View style={styles.dotsGroup}>
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
                />
              ))}
            </View>

            {/* Next Action Button on Right */}
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Next slide"
            >
              <Text style={styles.nextBtnText}>Next</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: 6 }}
              />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    position: 'relative',
  },
  mainContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  topRightDeco: {
    position: 'absolute',
    top: 24,
    right: 14,
    transform: [{ rotate: '25deg' }],
    zIndex: 0,
  },
  bottomLeftDeco: {
    position: 'absolute',
    bottom: 84,
    left: 10,
    transform: [{ rotate: '-45deg' }],
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 6,
    zIndex: 2,
  },
  logoIcon: {
    width: 44,
    height: 44,
    marginRight: 10,
  },
  headerTextGroup: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    color: Colors.primary.DEFAULT,
    lineHeight: 25,
  },
  brandTagline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#2A5D48',
  },
  carouselContainer: {
    flex: 1,
    overflow: 'hidden',
    zIndex: 1,
  },
  slidesTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  slideItem: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 10,
  },
  textContainer: {
    alignItems: 'flex-start',
    width: '100%',
    paddingTop: 6,
  },
  titleLine1: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: '#1E3A2F',
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  titleLine2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  titleLine2: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: '#1E3A2F',
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  cursorBlink: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.accent.DEFAULT,
    marginLeft: 2,
    lineHeight: 34,
  },
  raysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    height: 26,
    width: 22,
    position: 'relative',
  },
  rayLine: {
    position: 'absolute',
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: 2,
  },
  rayTop: {
    width: 14,
    height: 3.5,
    top: 2,
    left: 2,
    transform: [{ rotate: '-22deg' }],
  },
  rayMid: {
    width: 16,
    height: 3.5,
    top: 11,
    left: 4,
  },
  rayBot: {
    width: 14,
    height: 3.5,
    bottom: 2,
    left: 2,
    transform: [{ rotate: '22deg' }],
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#555E54',
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 380,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  imageAnimatedWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    maxWidth: 380,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    zIndex: 3,
  },
  skipBtn: {
    minWidth: 54,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#777D76',
  },
  skipHidden: {
    opacity: 0,
  },
  dotsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary.DEFAULT,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#C7D4C8',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.DEFAULT,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 24,
    minHeight: 46,
    shadowColor: Colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  getStartedBtn: {
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: 26,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  nextBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  lastSlideBottomContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    width: '100%',
    zIndex: 3,
  },
  lastDotsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  authButtonsWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  guestLinkWrapper: {
    paddingVertical: 12,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestLinkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.text.muted,
  },
});
