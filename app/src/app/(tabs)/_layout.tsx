import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 20);
  const tabHeight = (Platform.OS === 'ios' ? 56 : 60) + safeBottom;
  const tabPaddingBottom = safeBottom + (Platform.OS === 'android' ? 4 : 2);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.DEFAULT,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.border.DEFAULT,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: tabPaddingBottom,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: '#1C4D38',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="compass" size={17} color="#FFFFFF" />
              </View>
            ) : (
              <Ionicons name="compass-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meal-planner"
        options={{
          title: 'Meal Plan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
