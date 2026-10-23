import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_CONFIG: Record<
  string,
  {
    focusedIcon: keyof typeof Ionicons.glyphMap;
    outlineIcon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  home: {
    focusedIcon: 'home',
    outlineIcon: 'home-outline',
    label: 'Home',
  },
  discover: {
    focusedIcon: 'compass',
    outlineIcon: 'compass-outline',
    label: 'Discover',
  },
  search: {
    focusedIcon: 'search',
    outlineIcon: 'search-outline',
    label: 'Search',
  },
  'meal-planner': {
    focusedIcon: 'calendar',
    outlineIcon: 'calendar-outline',
    label: 'Meal Plan',
  },
  profile: {
    focusedIcon: 'person',
    outlineIcon: 'person-outline',
    label: 'Profile',
  },
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  // Ensure Android physical or gesture navigation bar never overlaps the tab bar
  const safeBottom = insets.bottom > 0
    ? insets.bottom + (Platform.OS === 'android' ? 10 : 2)
    : (Platform.OS === 'android' ? 26 : 16);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: safeBottom }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        if (options.href === null) return null;

        const isFocused = state.index === index;
        const isCenter = route.name === 'search';
        const config = TAB_CONFIG[route.name] || {
          focusedIcon: 'ellipse' as const,
          outlineIcon: 'ellipse-outline' as const,
          label: route.name,
        };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Center Hero Button (AI Chef / Smart Search)
        if (isCenter) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel="AI Chef Search"
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.centerTabWrapper}
            >
              <View style={[styles.centerHeroButton, isFocused && styles.centerHeroButtonActive]}>
                <Ionicons name="search" size={22} color="#FFFFFF" />
                <View style={styles.centerSparkleBadge}>
                  <Ionicons name="sparkles" size={10} color="#FBBF24" />
                </View>
              </View>
              <Text style={[styles.centerTabLabel, isFocused && styles.centerTabLabelActive]}>
                {config.label}
              </Text>
            </Pressable>
          );
        }

        // Standard Tab
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={config.label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <View style={[styles.tabContent, isFocused && styles.tabContentActive]}>
              <Ionicons
                name={isFocused ? config.focusedIcon : config.outlineIcon}
                size={21}
                color={isFocused ? '#1C4D38' : '#8E95A2'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
              {isFocused && <View style={styles.activeDot} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="meal-planner" options={{ title: 'Meal Plan' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EFF0F3',
    paddingTop: 8,
    shadowColor: '#0A2518',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    minHeight: 46,
  },
  tabContentActive: {
    backgroundColor: '#F0F7F3', // Soft organic sage pill
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '700',
    color: '#1C4D38',
  },
  tabLabelInactive: {
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
    color: '#8E95A2',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1C4D38',
    marginTop: 2,
  },
  centerTabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  centerHeroButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1C4D38',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#1C4D38',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  centerHeroButtonActive: {
    backgroundColor: '#143828',
    borderColor: '#E6F4EA',
    shadowColor: '#059669',
    shadowOpacity: 0.45,
  },
  centerSparkleBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  centerTabLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: '#8E95A2',
    marginTop: 4,
  },
  centerTabLabelActive: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '700',
    color: '#1C4D38',
  },
});
