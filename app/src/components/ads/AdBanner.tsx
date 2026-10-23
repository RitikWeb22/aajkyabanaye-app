import React from 'react';

interface AdBannerProps {
  unitId?: string;
  style?: any;
}

/**
 * AdBanner component disabled per user request for clean, premium UI.
 * Returns null safely on native and web without loading native ad libraries.
 */
export function AdBanner(_props: AdBannerProps) {
  return null;
}
