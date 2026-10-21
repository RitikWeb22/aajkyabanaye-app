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
  number: string;
  title: string;
  content: string[];
}

function Section({ number, title, content }: SectionProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{number}</Text>
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

export default function TermsOfServiceScreen() {
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
        <Text style={styles.topBarTitle}>Terms of Service</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Intro Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="document-text"
                size={28}
                color={Colors.primary.DEFAULT}
              />
            </View>
            <Text style={styles.heroTitle}>AajKyaBanaye Terms of Service</Text>
            <Text style={styles.heroSubtitle}>
              Please read these terms carefully before using the AajKyaBanaye application and culinary services.
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.versionBadge}>Last updated: October 2026</Text>
            </View>
          </View>

          {/* Terms Sections */}
          <Section
            number="1"
            title="Acceptance of Terms"
            content={[
              'By creating an account, browsing, or utilizing the AajKyaBanaye mobile application or website, you agree to comply with and be legally bound by these Terms of Service.',
              'If you do not agree to any part of these terms, please discontinue use of the application.',
            ]}
          />

          <Section
            number="2"
            title="Nature of Culinary Services"
            content={[
              'AajKyaBanaye is an intelligent cooking and meal planning assistant that suggests recipes based on ingredients you own, kitchen preferences, dietary guidelines, and pantry supplies.',
              'We provide recipes sourced from authorized providers (such as TheMealDB) and custom AI recipe generation engines. Preparation times, step-by-step guides, and portion estimates are intended as helpful guidance.',
            ]}
          />

          <Section
            number="3"
            title="AI Recipe Generation & Food Safety"
            content={[
              'AI-generated recipes are distinctly labeled with an "AI Generated" badge. These dishes are computed algorithmically based on user requests and have not been laboratory-tested.',
              'Users must exercise reasonable culinary judgment and care regarding food safety, proper internal cooking temperatures, raw ingredients, and personal food allergies.',
              'AajKyaBanaye and its creators are not liable for allergic reactions, culinary miscalculations, or adverse experiences arising from AI-generated instructions.',
            ]}
          />

          <Section
            number="4"
            title="User Accounts & Security"
            content={[
              'Account registration and authentication are securely managed via Clerk. You are responsible for safeguarding your login credentials and maintaining the confidentiality of your session.',
              'You agree to notify us immediately if you suspect unauthorized access or compromise of your culinary account.',
            ]}
          />

          <Section
            number="5"
            title="Shopping Lists & External Grocery"
            content={[
              'AajKyaBanaye allows users to select ingredients from recipes and generate customized shopping checklists.',
              'Any external links or clipboard integrations to instant grocery services (such as Swiggy Instamart) are subject to those independent third parties\' respective terms, stock availability, and pricing. AajKyaBanaye does not sell grocery goods directly.',
            ]}
          />

          <Section
            number="6"
            title="Intellectual Property & Content"
            content={[
              'The AajKyaBanaye name, branding, custom iconography, illustrations, and user interface are proprietary property.',
              'Recipes from third-party APIs remain attributed to their respective authorized providers with licensed rights preserved. Users may not scrape or replicate application assets for unauthorized commercial redistribution.',
            ]}
          />

          <Section
            number="7"
            title="Modifications & Termination"
            content={[
              'We reserve the right to modify or update these terms at any time. Notice of substantial updates will be reflected in this document with a refreshed date.',
              'Continued use of the application following updates constitutes acceptance of the modified Terms of Service.',
            ]}
          />

          <Section
            number="8"
            title="Contact & Culinary Inquiries"
            content={[
              'If you have any questions or feedback regarding these terms, please contact our support team at:',
              'Email: support@aajkyabanaye.com or reach out via the in-app Help section.',
            ]}
          />

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              Thank you for being part of the AajKyaBanaye culinary community! Happy cooking!
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
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: Colors.primary.DEFAULT,
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
