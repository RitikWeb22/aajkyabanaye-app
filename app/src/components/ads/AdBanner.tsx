import React, { useState, useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

interface AdBannerProps {
  unitId?: string;
  style?: any;
}

export function AdBanner({ unitId, style }: AdBannerProps) {
  const [AdComponent, setAdComponent] = useState<any>(null);
  const [adSize, setAdSize] = useState<any>(null);
  const [testBannerId, setTestBannerId] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    // Only attempt to load Google Mobile Ads on native platforms
    if (Platform.OS === 'web') {
      return;
    }

    let isMounted = true;

    async function loadAdModule() {
      try {
        const adsModule = await import('react-native-google-mobile-ads');
        if (isMounted && adsModule.BannerAd && adsModule.BannerAdSize) {
          setAdComponent(() => adsModule.BannerAd);
          setAdSize(adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER || adsModule.BannerAdSize.BANNER);
          setTestBannerId(adsModule.TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111');
        }
      } catch (e) {
        // Expected fallback in Expo Go / web where native binary is not bundled
        if (isMounted) {
          setIsError(true);
        }
      }
    }

    loadAdModule();

    return () => {
      isMounted = false;
    };
  }, []);

  // Web or native module error fallback
  if (Platform.OS === 'web' || isError || !AdComponent) {
    if (__DEV__) {
      return (
        <View style={[styles.devContainer, style]}>
          <Text style={styles.devBadgeText}>📢 Google AdMob Banner Slot</Text>
          <Text style={styles.devSubText}>Active on Android/iOS build (pub-1416168271239862)</Text>
        </View>
      );
    }
    return null;
  }

  // Use TestIds.BANNER in dev mode to prevent AdMob policy violations
  const targetUnitId = __DEV__
    ? testBannerId
    : unitId || process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || testBannerId;

  return (
    <View style={[styles.container, style]}>
      <AdComponent
        unitId={targetUnitId}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          if (__DEV__) console.log('[AdMob] Banner loaded successfully');
        }}
        onAdFailedToLoad={(error: any) => {
          if (__DEV__) console.warn('[AdMob] Banner failed to load:', error?.message || error);
          setIsError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    minHeight: 50,
  },
  devContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3EFE6',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4CEBF',
  },
  devBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary.DEFAULT,
    marginBottom: 2,
  },
  devSubText: {
    fontSize: 10.5,
    color: Colors.text.muted,
  },
});
