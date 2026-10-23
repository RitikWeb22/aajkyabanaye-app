import { Platform } from 'react-native';

let isInitialized = false;

/**
 * Safely initializes Google Mobile Ads SDK on native platforms.
 * Fails gracefully in Expo Go or Web environments without throwing.
 */
export async function initializeAdMob(): Promise<void> {
  if (isInitialized || Platform.OS === 'web') {
    return;
  }

  try {
    // Dynamic import to avoid breaking Web / Expo Go environments
    const mobileAdsModule = await import('react-native-google-mobile-ads');
    const mobileAds = mobileAdsModule.default;
    if (typeof mobileAds === 'function') {
      const adapterStatuses = await mobileAds().initialize();
      isInitialized = true;
      if (__DEV__) {
        console.log('[AdMob] Initialized successfully with adapters:', adapterStatuses);
      }
    }
  } catch (err) {
    if (__DEV__) {
      console.log('[AdMob] Native module not loaded (expected in Expo Go / Web):', (err as Error)?.message);
    }
  }
}
