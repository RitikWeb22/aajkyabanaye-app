/**
 * AajKyaBanaye Design System Tokens
 * Source of truth: AGENTS.md Section 12
 */

export const Colors = {
  primary: {
    DEFAULT: '#245C45',
    dark: '#1B4735',
    light: '#2F7558',
  },
  secondary: {
    DEFAULT: '#72A67A',
    light: '#8EB894',
  },
  accent: {
    DEFAULT: '#F4A340',
    hover: '#E09332',
  },
  background: {
    DEFAULT: '#FFF9F0',
    card: '#FFFFFF',
  },
  text: {
    DEFAULT: '#252923',
    muted: '#777D76',
  },
  border: {
    DEFAULT: '#E8E5DC',
  },
  disabled: {
    DEFAULT: '#D9DED9',
  },
  error: {
    DEFAULT: '#D94B45',
  },
  veg: '#248A3D',
  nonVeg: '#D94B45',
  aiBadge: '#7C3AED',
} as const;

export const Typography = {
  fonts: {
    heading: 'Poppins_600SemiBold',
    headingBold: 'Poppins_700Bold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
