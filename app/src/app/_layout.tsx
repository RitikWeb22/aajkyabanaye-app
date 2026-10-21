import '../../global.css';
import React, { useEffect } from 'react';
import { LogBox, StatusBar as RNStatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import * as WebBrowser from 'expo-web-browser';

// Intercept OAuth browser redirects for Clerk
WebBrowser.maybeCompleteAuthSession();

LogBox.ignoreLogs([
  'Clerk: Clerk has been loaded with development keys',
  'Clerk: Session has pending tasks',
]);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/expo';
import { useFonts, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { tokenCache } from '../lib/tokenCache';
import { apiClient } from '../services/api/apiClient';

function AuthTokenBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      apiClient.setTokenProvider(async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      });
    } else {
      apiClient.setTokenProvider(null);
      apiClient.setToken(null);
    }
  }, [isSignedIn, getToken]);

  return null;
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY ||
  'pk_test_aW50ZW50LWpvZXktNzU0MC5jbGVyay5hY2NvdW50cy5kZXYk';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AuthTokenBridge />
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <RNStatusBar barStyle="dark-content" backgroundColor="#FFF9F0" translucent={false} />
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#FFF9F0' },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="oauth-native-callback" />
              <Stack.Screen name="components-gallery" />
              <Stack.Screen name="terms" />
              <Stack.Screen name="privacy" />
              <Stack.Screen name="edit-profile" />
            </Stack>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
