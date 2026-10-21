import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface SectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  content: string[];
}

function PrivacySection({ icon, title, content }: SectionProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={18} color={Colors.primary.DEFAULT} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>
        {content.map((p, idx) => (
          <Text key={idx} style={styles.paragraph}>
            {p}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.8 },
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.primary.DEFAULT} />
        </Pressable>
        <Text style={styles.topBarTitle}>Privacy Policy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Hero Intro Card */}
          <View style={styles.heroCard}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="shield-checkmark"
                size={28}
                color={Colors.primary.DEFAULT}
              />
            </View>
            <Text style={styles.heroTitle}>Privacy & Data Protection</Text>
            <Text style={styles.heroSubtitle}>
              Your culinary journey and personal data are respected. Here is an honest,
              transparent breakdown of how we protect your information.
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.versionBadge}>Last updated: October 2026</Text>
            </View>
          </View>

          {/* Policy Sections */}
          <PrivacySection
            icon="person-circle-outline"
            title="1. Information We Collect"
            content={[
              '• Account Information: When creating an account via Clerk, we receive your email address, display name, and unique authentication identifier.',
              '• Culinary Preferences: Dietary guidelines you select (Pure Veg, Eggetarian, Vegan, Non-Veg), favorite regional cuisines, spice tolerance, and cooking skill levels.',
              '• Activity & Kitchen Data: Recipes you save to favorites, custom grocery lists, meal planner schedules, and dish searches.',
            ]}
          />

          <PrivacySection
            icon="sparkles-outline"
            title="2. How We Use Your Data"
            content={[
              '• To recommend personalized recipes based on ingredients you have at home in your pantry.',
              '• To generate balanced weekly meal plans and calculate combined shopping list ingredients.',
              '• To sync your culinary bookmarks and grocery items across your devices seamlessly.',
              '• We do not sell, rent, or trade your personal data to third-party advertising brokers.',
            ]}
          />

          <PrivacySection
            icon="hardware-chip-outline"
            title="3. AI Culinary Engine"
            content={[
              '• When you generate an AI recipe from custom ingredients, only culinary prompts, selected ingredients, and dietary filters are sent to our secure AI provider.',
              '• No personal identifiers (like full names, email addresses, or phone numbers) are ever shared with AI providers.',
              '• AI-generated outputs are stored as user-owned recipes strictly inside your account.',
            ]}
          />

          <PrivacySection
            icon="lock-closed-outline"
            title="4. Security & Cloud Storage"
            content={[
              '• Authentication Security: Managed via Clerk with encrypted token caching, salted hashing, and HTTPS transit.',
              '• Database Protection: Stored in dedicated MongoDB Atlas cloud infrastructure with network isolation and access restrictions.',
            ]}
          />

          <PrivacySection
            icon="share-social-outline"
            title="5. Third-Party Integrations"
            content={[
              '• Authentication: Clerk handles sign-in, OTP verification, and session token encryption.',
              '• Grocery Platforms: When using copy or export actions for external shopping platforms (such as Swiggy Instamart), only grocery item names are copied to your clipboard.',
            ]}
          />

          <PrivacySection
            icon="hand-left-outline"
            title="6. Your Rights & Data Control"
            content={[
              '• Full Control: Update dietary preferences and kitchen settings anytime from your Profile screen.',
              '• Data Deletion: Request full deletion of your account and saved history at any time by contacting our support team.',
              '• Sign Out: Signing out immediately removes session tokens from your device storage.',
            ]}
          />

          <PrivacySection
            icon="mail-outline"
            title="7. Contact Our Privacy Team"
            content={[
              'If you have any questions or feedback regarding our privacy practices, please contact us:',
              'Email: privacy@aajkyabanaye.com',
              'We respond to all verified inquiries within 48 business hours.',
            ]}
          />

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              AajKyaBanaye — Cook with confidence. Your privacy is safeguarded.
            </Text>
          </View>
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
  topBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DC',
    backgroundColor: '#FFF9F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DDCF',
  },
  topBarTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: Colors.text.DEFAULT,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 48,
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECE8DF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4E6DA',
  },
  heroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    color: Colors.text.DEFAULT,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  versionBadge: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.primary.DEFAULT,
    backgroundColor: '#EAF3ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECE8DF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    color: Colors.text.DEFAULT,
    flex: 1,
  },
  sectionBody: {
    gap: 8,
    paddingLeft: 4,
  },
  paragraph: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#4A554E',
    lineHeight: 18,
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  footerNoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: Colors.text.muted,
    textAlign: 'center',
  },
});
