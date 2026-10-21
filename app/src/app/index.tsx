import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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

  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      if (isSignedIn || hasCompletedOnboarding) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding, isSignedIn, isLoaded, router]);

  const handleManualNavigate = () => {
    if (isSignedIn || hasCompletedOnboarding) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(tabs)/home'); // Direct access to Home
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable style={styles.container} onPress={handleManualNavigate}>
        {/* Brand Icon with Pot */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            contentFit="contain"
            transition={300}
          />
        </View>

        {/* Brand Typography */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            AajKya<Text style={styles.titleAccent}>Banaye</Text>
          </Text>
          <Text style={styles.tagline}>Aaj kya banega? Let's find out!</Text>
          <Text style={styles.splashLine}>Your next delicious meal starts here.</Text>
        </View>

        {/* Fast Action CTA */}
        <View style={styles.actionWrapper}>
          <Button
            title="Let's Cook"
            onPress={handleManualNavigate}
            variant="primary"
            size="lg"
            fullWidth
            icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            iconPosition="right"
          />
        </View>
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
  },
  logoWrapper: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
    marginBottom: 28,
    overflow: 'hidden',
  },
  logo: {
    width: 160,
    height: 160,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 44,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    color: Colors.primary.DEFAULT,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: Colors.accent.DEFAULT,
  },
  tagline: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text.DEFAULT,
    marginTop: 6,
  },
  splashLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  actionWrapper: {
    width: '100%',
    maxWidth: 320,
  },
});
