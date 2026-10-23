import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser, useClerk, useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api/apiClient';
import { useFavorites } from '../../hooks/useFavorites';
import { useUserProfile } from '../../hooks/useUserProfile';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
  isDestructive?: boolean;
  isLast?: boolean;
  iconColor?: string;
  iconBg?: string;
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  isDestructive = false,
  isLast = false,
  iconColor,
  iconBg,
}: MenuItemProps) {
  const finalIconColor = isDestructive
    ? Colors.error.DEFAULT
    : iconColor || '#1C4D38';
  const finalIconBg = isDestructive
    ? '#FEE2E2'
    : iconBg || '#EBF6F0';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        isLast && styles.menuItemLast,
        pressed && styles.menuItemPressed,
        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: finalIconBg }]}>
        <Ionicons name={icon} size={18} color={finalIconColor} />
      </View>

      <View style={styles.menuTextCol}>
        <Text
          style={[styles.menuTitle, isDestructive && styles.menuTitleDestructive]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.menuSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {badge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();

  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);
  const dietaryPreferences = useAppStore((s) => s.dietaryPreferences);
  const favoriteCuisines = useAppStore((s) => s.favoriteCuisines);
  const spiceLevel = useAppStore((s) => s.spiceLevel);
  const userPhoneNumber = useAppStore((s) => s.phoneNumber);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: favorites } = useFavorites();
  const { data: userProfile } = useUserProfile();
  const storedAvatarUrl = useAppStore((s) => s.avatarUrl);

  // Sync auth token to API client
  useEffect(() => {
    async function syncAuth() {
      if (isSignedIn) {
        try {
          const token = await getToken();
          apiClient.setToken(token);
        } catch {
          apiClient.setToken(null);
        }
      } else {
        apiClient.setToken(null);
      }
    }
    syncAuth();
  }, [isSignedIn, getToken]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    try {
      setIsSigningOut(true);
      await signOut();
      apiClient.setToken(null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to sign out of AajKyaBanaye?')) {
        handleSignOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of AajKyaBanaye?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: handleSignOut },
        ]
      );
    }
  };

  const displayName = isSignedIn
    ? userProfile?.displayName || user?.fullName || user?.firstName || 'Chef'
    : 'Guest Chef';
  const emailDisplay = isSignedIn
    ? user?.primaryEmailAddress?.emailAddress || ''
    : 'Sign in to sync your kitchen, meal plans & favorites';
  const phoneDisplay = user?.primaryPhoneNumber?.phoneNumber || userPhoneNumber || '';

  const primaryDiet = dietaryPreferences[0] || 'Vegetarian';
  const primaryCuisine = favoriteCuisines[0] || 'North Indian';
  const isVeg =
    primaryDiet.toLowerCase().includes('veg') &&
    !primaryDiet.toLowerCase().includes('non');

  const effectiveAvatarUrl =
    storedAvatarUrl ||
    userProfile?.avatarUrl ||
    (isSignedIn ? user?.imageUrl : undefined);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile Header Hero Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardTop}>
            {/* Avatar with Camera/Edit Badge */}
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [
                styles.avatarContainer,
                pressed && { opacity: 0.88 },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit profile picture"
            >
              {effectiveAvatarUrl ? (
                <Image
                  source={{ uri: effectiveAvatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={38} color="#1C4D38" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </Pressable>

            {/* Name & Chef Level */}
            <View style={styles.nameSection}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.chefBadge}>
                  <Ionicons name="sparkles" size={10} color="#059669" />
                  <Text style={styles.chefBadgeText}>{isSignedIn ? 'Chef' : 'Guest'}</Text>
                </View>
              </View>

              <Text style={styles.userEmail} numberOfLines={1}>
                {emailDisplay}
              </Text>

              {phoneDisplay ? (
                <View style={styles.phoneRow}>
                  <Ionicons name="call-outline" size={11} color="#64748B" />
                  <Text style={styles.phoneText}>{phoneDisplay}</Text>
                </View>
              ) : null}
            </View>

            {/* Edit Profile Touch Target */}
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [
                styles.editProfileBtn,
                pressed && { opacity: 0.8 },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit profile details"
              hitSlop={8}
            >
              <Ionicons name="pencil" size={14} color="#1C4D38" />
            </Pressable>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <Pressable
              style={styles.metricItem}
              onPress={() => router.push('/favorites')}
              accessibilityRole="button"
            >
              <Text style={styles.metricNumber}>{favorites?.length || 0}</Text>
              <Text style={styles.metricLabel}>Favorites</Text>
            </Pressable>

            <View style={styles.metricDivider} />

            <Pressable
              style={styles.metricItem}
              onPress={() => router.push('/diet-preferences')}
              accessibilityRole="button"
            >
              <Text style={styles.metricNumber} numberOfLines={1}>
                {primaryDiet.length > 9 ? `${primaryDiet.slice(0, 8)}...` : primaryDiet}
              </Text>
              <Text style={styles.metricLabel}>Diet</Text>
            </Pressable>

            <View style={styles.metricDivider} />

            <Pressable
              style={styles.metricItem}
              onPress={() => router.push('/diet-preferences')}
              accessibilityRole="button"
            >
              <Text style={styles.metricNumber} numberOfLines={1}>
                {primaryCuisine.length > 9 ? `${primaryCuisine.slice(0, 8)}...` : primaryCuisine}
              </Text>
              <Text style={styles.metricLabel}>Cuisine</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Kitchen DNA & Taste Profile Card */}
        <Pressable
          style={({ pressed }) => [
            styles.tasteDnaCard,
            pressed && { opacity: 0.94 },
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          onPress={() => router.push('/diet-preferences')}
          accessibilityRole="button"
          accessibilityLabel="Adjust Taste DNA Preferences"
        >
          <View style={styles.tasteDnaHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="restaurant-outline" size={16} color="#1C4D38" />
              <Text style={styles.tasteDnaTitle}>Your Kitchen DNA</Text>
            </View>
            <View style={styles.tunePill}>
              <Text style={styles.tunePillText}>Tune</Text>
              <Ionicons name="chevron-forward" size={12} color="#1C4D38" />
            </View>
          </View>

          <View style={styles.dietTagsRow}>
            <Badge type={isVeg ? 'veg' : 'nonVeg'} />
            <Badge label={primaryDiet} />
            <Badge label={primaryCuisine} />
            {spiceLevel ? <Badge label={`${spiceLevel} Spice`} /> : null}
          </View>
        </Pressable>

        {/* 3. Menu Section: Kitchen & Recipes */}
        <View style={styles.menuSection}>
          <Text style={styles.groupHeading}>Kitchen & Cooking</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="heart"
              title="Saved Favorites"
              subtitle="Recipes you love and want to cook again"
              badge={
                favorites && favorites.length > 0
                  ? String(favorites.length)
                  : undefined
              }
              iconColor="#E11D48"
              iconBg="#FFE4E6"
              onPress={() => router.push('/favorites')}
            />
            <MenuItem
              icon="cart"
              title="My Grocery Lists"
              subtitle="Pantry shopping items & meal plan lists"
              iconColor="#16A34A"
              iconBg="#DCFCE7"
              onPress={() => router.push('/grocery-list')}
            />
            <MenuItem
              icon="options"
              title="Diet & Cuisine Preferences"
              subtitle={`${primaryDiet} • ${favoriteCuisines.slice(0, 2).join(', ')}`}
              iconColor="#D97706"
              iconBg="#FEF3C7"
              onPress={() => router.push('/diet-preferences')}
              isLast
            />
          </View>
        </View>

        {/* 4. Menu Section: Account & App Settings */}
        <View style={styles.menuSection}>
          <Text style={styles.groupHeading}>Account & App</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-circle"
              title="Edit Profile"
              subtitle="Update display name, avatar & details"
              iconColor="#2563EB"
              iconBg="#DBEAFE"
              onPress={() => router.push('/edit-profile')}
            />
            <MenuItem
              icon="sparkles"
              title="Replay Onboarding Tour"
              subtitle="Explore smart kitchen & timer features"
              iconColor="#7C3AED"
              iconBg="#EDE9FE"
              onPress={() => {
                setHasCompletedOnboarding(false);
                router.push('/onboarding');
              }}
            />
            <MenuItem
              icon="document-text"
              title="Terms of Service"
              subtitle="User agreement & culinary terms"
              iconColor="#475569"
              iconBg="#F1F5F9"
              onPress={() => router.push('/terms')}
            />
            <MenuItem
              icon="shield-checkmark"
              title="Privacy Policy"
              subtitle="Data protection & food privacy rights"
              iconColor="#059669"
              iconBg="#EBF6F0"
              onPress={() => router.push('/privacy')}
              isLast
            />
          </View>
        </View>

        {/* 5. Auth / Sign Out Section */}
        {isSignedIn ? (
          <View style={styles.actionBtnRow}>
            <Pressable
              onPress={confirmSignOut}
              disabled={isSigningOut}
              style={({ pressed }) => [
                styles.signOutPressable,
                pressed && { opacity: 0.8 },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              <Ionicons name="log-out-outline" size={17} color="#DC2626" />
              <Text style={styles.signOutText}>
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.authBanner}>
            <View style={styles.authBannerTextCol}>
              <Text style={styles.authBannerTitle}>Unlock Full Experience</Text>
              <Text style={styles.authBannerSub}>
                Sign in to sync your weekly meal plans and darkstore carts across devices.
              </Text>
            </View>
            <View style={styles.authBannerBtns}>
              <Button
                title="Sign In"
                onPress={() => router.push('/(auth)/sign-in')}
                variant="primary"
                size="sm"
                style={{ flex: 1, marginRight: 8 }}
                icon={<Ionicons name="log-in-outline" size={16} color="#FFFFFF" />}
              />
              <Button
                title="Create Account"
                onPress={() => router.push('/(auth)/sign-up')}
                variant="outline"
                size="sm"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* 6. Compact App Version Footer */}
        <View style={styles.footerWrapper}>
          <Text style={styles.footerAppTitle}>AajKyaBanaye</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 • Made with love for food lovers</Text>
          <View style={styles.swiggyCoBrandFooterBadge}>
            <Ionicons name="flash" size={10} color="#FC8019" />
            <Text style={styles.swiggyCoBrandFooterText}>Powered by Swiggy Instamart</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24, // Compact bottom padding - no extra space!
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  /* Profile Header Hero Card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  profileCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 14,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EBF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C6E3CD',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#1C4D38',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1C4D38',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  chefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EBF6F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C6E3CD',
  },
  chefBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#059669',
  },
  userEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#64748B',
  },
  editProfileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  /* Quick Metrics Bar */
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricNumber: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#0F172A',
  },
  metricLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },

  /* Kitchen DNA Card */
  tasteDnaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tasteDnaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tasteDnaTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#0F172A',
  },
  tunePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EBF6F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tunePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#1C4D38',
  },
  dietTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },

  /* Menu Sections */
  menuSection: {
    marginBottom: 14,
  },
  groupHeading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  menuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  menuTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#0F172A',
  },
  menuTitleDestructive: {
    color: '#DC2626',
  },
  menuSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  menuBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  menuBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#DC2626',
  },

  /* Sign Out & Auth CTA */
  actionBtnRow: {
    width: '100%',
    marginTop: 4,
    marginBottom: 10,
  },
  signOutPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 12,
  },
  signOutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#DC2626',
  },
  authBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 10,
  },
  authBannerTextCol: {
    marginBottom: 12,
  },
  authBannerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#0F172A',
  },
  authBannerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  authBannerBtns: {
    flexDirection: 'row',
  },

  /* Footer */
  footerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  footerAppTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#64748B',
  },
  footerVersion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  swiggyCoBrandFooterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  swiggyCoBrandFooterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#EA580C',
    letterSpacing: 0.1,
  },
});
