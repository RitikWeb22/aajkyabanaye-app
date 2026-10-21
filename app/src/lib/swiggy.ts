import { Linking, Platform } from 'react-native';

/**
 * Universal Swiggy Instamart Deep Linking Utility
 * 
 * Supports:
 * - Native Android Intent scheme for in.swiggy.android
 * - iOS Universal Links and swiggy:// custom scheme
 * - Fallback to https://www.swiggy.com/instamart
 */

/**
 * Opens Swiggy Instamart home or search
 */
export async function openSwiggyInstamart(query?: string): Promise<boolean> {
  const clean = query?.trim();

  if (clean) {
    const encoded = encodeURIComponent(clean);
    const urls = Platform.select({
      android: [
        `swiggy://instamart/search?query=${encoded}`,
        `intent://instamart/search?query=${encoded}#Intent;scheme=swiggy;package=in.swiggy.android;end`,
        `swiggy://explore?query=${encoded}`,
        `https://www.swiggy.com/instamart/search?query=${encoded}`,
      ],
      ios: [
        `swiggy://instamart/search?query=${encoded}`,
        `swiggy://explore?query=${encoded}`,
        `https://www.swiggy.com/instamart/search?query=${encoded}`,
      ],
      default: [
        `https://www.swiggy.com/instamart/search?query=${encoded}`,
      ],
    });

    for (const url of urls || []) {
      try {
        await Linking.openURL(url);
        return true;
      } catch {}
    }
    return false;
  }

  // Open Instamart home/hub
  const homeUrls = Platform.select({
    android: [
      'swiggy://instamart',
      'intent://instamart#Intent;scheme=swiggy;package=in.swiggy.android;end',
      'swiggy://explore',
      'swiggy://cart',
      'https://www.swiggy.com/instamart',
    ],
    ios: [
      'swiggy://instamart',
      'swiggy://explore',
      'swiggy://cart',
      'https://www.swiggy.com/instamart',
    ],
    default: [
      'https://www.swiggy.com/instamart',
    ],
  });

  for (const url of homeUrls || []) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {}
  }
  return false;
}
