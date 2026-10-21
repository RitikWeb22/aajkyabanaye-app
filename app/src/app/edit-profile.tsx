import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/theme';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { apiClient } from '../services/api/apiClient';
import { useUserProfile, useUploadAvatar } from '../hooks/useUserProfile';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const { data: userProfile } = useUserProfile();
  const uploadAvatarMutation = useUploadAvatar();

  const chefBio = useAppStore((s) => s.chefBio);
  const storedPhoneNumber = useAppStore((s) => s.phoneNumber);
  const storedAvatarUrl = useAppStore((s) => s.avatarUrl);
  const setAvatarUrl = useAppStore((s) => s.setAvatarUrl);
  const setKitchenPreferences = useAppStore((s) => s.setKitchenPreferences);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(storedPhoneNumber || '');
  const [bio, setBio] = useState(chefBio || '');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const currentAvatarUri =
    localAvatarUri ||
    storedAvatarUrl ||
    userProfile?.avatarUrl ||
    (isSignedIn ? user?.imageUrl : null);

  // Prepopulate from Clerk or stored preferences
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.primaryEmailAddress?.emailAddress || '');
      setPhone(user.primaryPhoneNumber?.phoneNumber || storedPhoneNumber || '');
    } else if (storedPhoneNumber) {
      setPhone(storedPhoneNumber);
    }
  }, [user, storedPhoneNumber]);

  const handlePickImage = async () => {
    try {
      setNotice(null);

      // Request media library permission
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setNotice({
            type: 'error',
            text: 'Permission to access gallery is required to choose a profile photo.',
          });
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setLocalAvatarUri(asset.uri);

      // Upload to Cloudinary via backend if signed in
      if (isSignedIn) {
        const imagePayload = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        const uploadRes = await uploadAvatarMutation.mutateAsync(imagePayload);
        if (uploadRes?.avatarUrl) {
          setAvatarUrl(uploadRes.avatarUrl);
        }
        setNotice({
          type: 'success',
          text: (uploadRes as any)?.message || 'Profile photo saved successfully!',
        });
      } else {
        setAvatarUrl(asset.uri);
        setNotice({
          type: 'success',
          text: 'Photo selected for this session. Sign in to sync across devices.',
        });
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setNotice({
        type: 'error',
        text: err?.message || 'Failed to upload photo. Please check Cloudinary configuration.',
      });
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setNotice(null);

    try {
      // 1. Update Clerk user profile (name) if authenticated
      if (isSignedIn && user) {
        try {
          await user.update({
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
          });
        } catch (clerkErr: any) {
          console.warn('Clerk user update notice:', clerkErr);
        }
      }

      // 2. Update local Zustand state
      setKitchenPreferences({
        chefBio: bio.trim(),
        phoneNumber: phone.trim(),
      });

      // 3. Sync to MongoDB API if authenticated
      if (isSignedIn) {
        try {
          const fullName = `${firstName} ${lastName}`.trim();
          await apiClient.updateProfile({
            displayName: fullName || 'Home Chef',
          });
        } catch (apiErr: any) {
          console.warn('Backend profile sync notice:', apiErr);
        }
      }

      setNotice({ type: 'success', text: 'Profile changes saved successfully!' });

      setTimeout(() => {
        router.back();
      }, 750);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || 'Could not save profile changes. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = isSignedIn
    ? user?.fullName || `${firstName} ${lastName}`.trim() || 'Chef'
    : 'Guest Chef';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Compact Top Header with One Single Save Action */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.8 },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.primary.DEFAULT} />
          </Pressable>

          <Text style={styles.headerTitle}>Edit Profile</Text>

          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.headerSaveBtn,
              pressed && styles.headerSaveBtnPressed,
              isSaving && { opacity: 0.6 },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save profile changes"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.headerSaveText}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            {/* Notification Banner */}
            {notice && (
              <View
                style={[
                  styles.noticeBanner,
                  notice.type === 'success' ? styles.noticeSuccess : styles.noticeError,
                ]}
              >
                <Ionicons
                  name={notice.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={notice.type === 'success' ? '#15803D' : Colors.error.DEFAULT}
                />
                <Text
                  style={[
                    styles.noticeText,
                    notice.type === 'success'
                      ? styles.noticeTextSuccess
                      : styles.noticeTextError,
                  ]}
                >
                  {notice.text}
                </Text>
              </View>
            )}

            {/* Profile Avatar & Identity */}
            <View style={styles.profileHero}>
              <Pressable
                onPress={handlePickImage}
                disabled={uploadAvatarMutation.isPending}
                style={({ pressed }) => [
                  styles.avatarWrapper,
                  pressed && { opacity: 0.85 },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                accessibilityRole="button"
                accessibilityLabel="Choose profile photo"
              >
                {currentAvatarUri ? (
                  <Image
                    source={{ uri: currentAvatarUri }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={38} color={Colors.primary.DEFAULT} />
                  </View>
                )}

                {/* Camera / Upload Badge */}
                <View style={styles.cameraBadge}>
                  {uploadAvatarMutation.isPending ? (
                    <ActivityIndicator size={12} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={13} color="#FFFFFF" />
                  )}
                </View>
              </Pressable>

              <Pressable
                onPress={handlePickImage}
                disabled={uploadAvatarMutation.isPending}
                style={({ pressed }) => [
                  styles.changePhotoBtn,
                  pressed && { opacity: 0.75 },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                <Text style={styles.changePhotoText}>
                  {uploadAvatarMutation.isPending ? 'Uploading to Cloudinary...' : 'Change Photo'}
                </Text>
              </Pressable>

              <Text style={styles.heroName} numberOfLines={1}>
                {displayName}
              </Text>
              {email ? (
                <Text style={styles.heroEmail} numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
            </View>

            {/* Section: Personal Details */}
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input
                    label="First Name"
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                    containerStyle={{ marginBottom: 12 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Last Name"
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                    containerStyle={{ marginBottom: 12 }}
                  />
                </View>
              </View>

              {email ? (
                <Input
                  label="Email Address"
                  placeholder="Email"
                  value={email}
                  editable={false}
                  containerStyle={{ marginBottom: 12 }}
                  leftIcon={<Ionicons name="mail-outline" size={17} color={Colors.text.muted} />}
                />
              ) : null}

              <Input
                label="Mobile Number (Optional)"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                editable={true}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                containerStyle={{ marginBottom: 12 }}
                leftIcon={<Ionicons name="call-outline" size={17} color={Colors.text.muted} />}
              />

              <Input
                label="Cooking Bio (Optional)"
                placeholder="Share your culinary style or favorite foods..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                containerStyle={{ marginBottom: 4 }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0', // Warm off-white
  },
  keyboardView: {
    flex: 1,
  },

  /* Top Bar Header */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DC',
    backgroundColor: '#FFF9F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2DDCF',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: Colors.text.DEFAULT,
  },
  headerSaveBtn: {
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveBtnPressed: {
    backgroundColor: '#1B4735',
    transform: [{ scale: 0.98 }],
  },
  headerSaveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* Scrollable Content */
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingBottom: 36,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
  },

  /* Notification Banner */
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  noticeSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  noticeError: {
    backgroundColor: '#FDE8E8',
    borderColor: Colors.error.DEFAULT,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    marginLeft: 8,
  },
  noticeTextSuccess: {
    color: '#15803D',
  },
  noticeTextError: {
    color: Colors.error.DEFAULT,
  },

  /* Profile Hero */
  profileHero: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: Colors.primary.DEFAULT,
  },
  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D4E6DA',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF9F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
  },
  changePhotoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#EAF3ED',
    marginBottom: 8,
    marginTop: 2,
  },
  changePhotoText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary.DEFAULT,
  },
  heroName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.text.DEFAULT,
  },
  heroEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 1,
  },

  /* Card Section */
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ECE8DF',
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    color: Colors.text.DEFAULT,
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
  },
});
