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
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  isDestructive = false,
  isLast = false,
}: MenuItemProps) {
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
      <View
        style={[
          styles.menuIconCircle,
          isDestructive && styles.menuIconCircleDestructive,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={isDestructive ? Colors.error.DEFAULT : Colors.primary.DEFAULT}
        />
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

      <Ionicons name="chevron-forward" size={17} color={Colors.text.muted} />
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
    if (Alert?.alert) {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of AajKyaBanaye?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: handleSignOut },
        ]
      );
    } else {
      handleSignOut();
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
        {/* 2. Profile Header Card */}
        <View style={styles.profileCard}>
          {/* Avatar with Edit Badge */}
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
                <Ionicons name="person" size={38} color={Colors.primary.DEFAULT} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* User Name & Quick Edit Action */}
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [
                styles.editPencilBtn,
                pressed && { opacity: 0.75 },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={14} color="#1C4D38" />
              <Text style={styles.editPencilText}>Edit</Text>
            </Pressable>
          </View>

          {/* Email / Sign In Prompt */}
          <Text style={styles.userEmail} numberOfLines={2}>
            {emailDisplay}
          </Text>

          {/* Phone Display (if available) */}
          {phoneDisplay ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={13} color={Colors.text.muted} />
              <Text style={styles.phoneText}>{phoneDisplay}</Text>
            </View>
          ) : null}

          {/* Kitchen Preference Badges */}
          <Pressable
            onPress={() => router.push('/diet-preferences')}
            style={({ pressed }) => [
              styles.dietTagsRow,
              pressed && { opacity: 0.8 },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            accessibilityRole="button"
            accessibilityLabel="Edit diet and cuisine preferences"
          >
            <Badge type={isVeg ? 'veg' : 'nonVeg'} />
            <Badge label={primaryDiet} />
            <Badge label={primaryCuisine} />
            {spiceLevel ? <Badge label={`${spiceLevel} Spice`} /> : null}
          </Pressable>

          {/* 3. Account Actions: Sign Out vs Guest Auth */}
          {isSignedIn ? (
            <View style={styles.actionBtnRow}>
              <Button
                title="Sign Out"
                onPress={confirmSignOut}
                loading={isSigningOut}
                disabled={isSigningOut}
                variant="outline"
                size="md"
                fullWidth
                style={styles.signOutBtn}
                icon={
                  <Ionicons
                    name="log-out-outline"
                    size={17}
                    color={Colors.error.DEFAULT}
                  />
                }
              />
            </View>
          ) : (
            <View style={styles.authBtnGroup}>
              <Button
                title="Sign In"
                onPress={() => router.push('/(auth)/sign-in')}
                variant="primary"
                size="md"
                style={{ flex: 1, marginRight: 8 }}
                icon={<Ionicons name="log-in-outline" size={18} color="#FFFFFF" />}
              />
              <Button
                title="Create Account"
                onPress={() => router.push('/(auth)/sign-up')}
                variant="outline"
                size="md"
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>

        {/* 4. Menu Section 1: Account & Kitchen Profile */}
        <View style={styles.menuSection}>
          <Text style={styles.groupHeading}>Account & Kitchen Profile</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-circle-outline"
              title="Edit Profile"
              subtitle="Update name, display details & bio"
              onPress={() => router.push('/edit-profile')}
            />
            <MenuItem
              icon="nutrition-outline"
              title="Diet & Cuisine Preferences"
              subtitle={`${primaryDiet} • ${favoriteCuisines.slice(0, 2).join(', ')}${
                favoriteCuisines.length > 2 ? '...' : ''
              }`}
              onPress={() => router.push('/diet-preferences')}
              isLast
            />
          </View>
        </View>

        {/* 4. Menu Section 2: Personal Kitchen */}
        <View style={styles.menuSection}>
          <Text style={styles.groupHeading}>Personal Kitchen</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="heart-outline"
              title="Saved Favorites"
              subtitle="Recipes you love"
              badge={
                favorites && favorites.length > 0
                  ? String(favorites.length)
                  : undefined
              }
              onPress={() => router.push('/favorites')}
            />
            <MenuItem
              icon="cart-outline"
              title="My Grocery Lists"
              subtitle="Pantry shopping items & meal plan lists"
              onPress={() => router.push('/grocery-list')}
              isLast
            />
          </View>
        </View>

        {/* 4. Menu Section 3: Preferences & Help */}
        <View style={styles.menuSection}>
          <Text style={styles.groupHeading}>Preferences & Help</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="refresh-outline"
              title="Replay Onboarding Tour"
              subtitle="Review features and introduction"
              onPress={() => {
                setHasCompletedOnboarding(false);
                router.push('/onboarding');
              }}
            />
            <MenuItem
              icon="document-text-outline"
              title="Terms of Service"
              subtitle="User agreement & culinary terms"
              onPress={() => router.push('/terms')}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="Data protection & your rights"
              onPress={() => router.push('/privacy')}
              isLast
            />
          </View>
        </View>

        {/* App Version Footer */}
        <View style={styles.footerWrapper}>
          <Text style={styles.footerAppTitle}>AajKyaBanaye</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 • Made for food lovers</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0', // Warm off-white
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 120,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  /* 2. Profile Card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE8DD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4E6DA',
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    borderColor: Colors.primary.DEFAULT,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  userName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: Colors.text.DEFAULT,
    letterSpacing: -0.2,
  },
  editPencilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF3ED',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D2E5DA',
  },
  editPencilText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#1C4D38',
    marginLeft: 3,
  },
  userEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: Colors.text.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
  },
  phoneText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: Colors.text.muted,
  },
  dietTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  actionBtnRow: {
    width: '100%',
    marginTop: 16,
  },
  signOutBtn: {
    borderColor: '#FED7D7',
    backgroundColor: '#FFF8F8',
  },
  authBtnGroup: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 16,
  },

  /* 4. Menu Sections */
  menuSection: {
    marginBottom: 18,
  },
  groupHeading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECE7DC',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2EB',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemPressed: {
    backgroundColor: '#FAF8F3',
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  menuIconCircleDestructive: {
    backgroundColor: '#FDECEB',
  },
  menuTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  menuTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
  },
  menuTitleDestructive: {
    color: Colors.error.DEFAULT,
  },
  menuSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: Colors.text.muted,
    marginTop: 1,
  },
  menuBadge: {
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
  },
  menuBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  /* Footer */
  footerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  footerAppTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.text.muted,
  },
  footerVersion: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#A09C90',
    marginTop: 2,
  },
});
