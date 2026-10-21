import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';

// Complete any active WebBrowser OAuth sessions
WebBrowser.maybeCompleteAuthSession();

export default function OAuthNativeCallback() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      router.replace('/(tabs)/home');
    } else {
      // Allow a brief moment for the Clerk session token to settle
      const timeout = setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1E5038" />
      <Text style={styles.title}>Completing Sign In...</Text>
      <Text style={styles.subtitle}>Setting up your delicious kitchen experience</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7EE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#16281E',
  },
  subtitle: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#68776D',
    textAlign: 'center',
  },
});
