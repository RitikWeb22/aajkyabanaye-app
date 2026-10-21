import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@clerk/expo';
import { Colors } from '../constants/theme';
import { IconButton, Button, Badge, Skeleton, EmptyState } from '../components/ui';
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites';

export default function FavoritesScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { data: favorites, isLoading, refetch } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVeg, setFilterVeg] = useState<'all' | 'veg' | 'non-veg'>('all');

  const filteredFavorites = useMemo(() => {
    if (!favorites) return [];
    return favorites.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.cuisine && item.cuisine.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesVeg =
        filterVeg === 'all'
          ? true
          : filterVeg === 'veg'
          ? item.isVeg === true
          : item.isVeg === false;

      return matchesSearch && matchesVeg;
    });
  }, [favorites, searchQuery, filterVeg]);

  const handleRemove = (item: any) => {
    toggleFavoriteMutation.mutate({
      recipeId: item.id,
      isCurrentlyFavorited: true,
      snapshot: {
        title: item.title,
        image: item.image,
        cuisine: item.cuisine,
        isVeg: item.isVeg,
        cookTimeMins: item.cookTimeMins,
        servings: item.servings,
        difficulty: item.difficulty,
      },
    });
  };

  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon={<Ionicons name="arrow-back" size={22} color={Colors.text.DEFAULT} />}
            onPress={() => router.back()}
            variant="card"
            size="sm"
            accessibilityLabel="Back"
          />
          <Text style={styles.headerTitle}>Saved Favorites</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.authPromptContainer}>
          <View style={styles.authIconCircle}>
            <Ionicons name="heart" size={36} color="#E11D48" />
          </View>
          <Text style={styles.authTitle}>Your Personal Recipe Vault</Text>
          <Text style={styles.authSubtitle}>
            Sign in to sync and access your favorite recipes across all your devices anytime.
          </Text>
          <Button
            title="Sign In to Your Kitchen"
            onPress={() => router.push('/(auth)/sign-in')}
            variant="primary"
            size="lg"
            icon={<Ionicons name="log-in-outline" size={20} color="#FFFFFF" />}
            style={{ width: '85%', marginTop: 8 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={Colors.text.DEFAULT} />}
          onPress={() => router.back()}
          variant="card"
          size="sm"
          accessibilityLabel="Back"
        />
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Saved Favorites</Text>
          {favorites && (
            <Text style={styles.headerSubtitle}>
              {favorites.length} {favorites.length === 1 ? 'recipe' : 'recipes'} in vault
            </Text>
          )}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Search & Filters */}
      {favorites && favorites.length > 0 && (
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.text.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your saved recipes..."
              placeholderTextColor={Colors.text.muted}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={Colors.text.muted} />
              </Pressable>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            <Pressable
              style={[styles.filterPill, filterVeg === 'all' && styles.filterPillActive]}
              onPress={() => setFilterVeg('all')}
            >
              <Text style={[styles.filterPillText, filterVeg === 'all' && styles.filterPillTextActive]}>
                All ({favorites.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPill, filterVeg === 'veg' && styles.filterPillActive]}
              onPress={() => setFilterVeg('veg')}
            >
              <Text style={[styles.filterPillText, filterVeg === 'veg' && styles.filterPillTextActive]}>
                🌱 Pure Veg
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPill, filterVeg === 'non-veg' && styles.filterPillActive]}
              onPress={() => setFilterVeg('non-veg')}
            >
              <Text style={[styles.filterPillText, filterVeg === 'non-veg' && styles.filterPillTextActive]}>
                🍗 Non-Veg
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
          ))}
        </View>
      ) : !favorites || favorites.length === 0 ? (
        <EmptyState
          title="No favorites saved yet"
          message="Whenever you spot a recipe you'd love to cook, tap the heart icon on the recipe screen to save it here."
          actionTitle="Discover Recipes"
          onActionPress={() => router.push('/(tabs)/discover')}
          iconName="heart-outline"
        />
      ) : filteredFavorites.length === 0 ? (
        <EmptyState
          title="No matching favorites"
          message="Try adjusting your search terms or dietary filter to see other saved dishes."
          actionTitle="Clear Filters"
          onActionPress={() => {
            setSearchQuery('');
            setFilterVeg('all');
          }}
          iconName="search-outline"
        />
      ) : (
        <FlatList
          data={filteredFavorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.recipeCard,
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              onPress={() => router.push(`/recipe/${item.id}`)}
            >
              <Image
                source={item.image ? { uri: item.image } : require('../../assets/images/logo.png')}
                style={styles.cardImage}
                contentFit="cover"
                transition={200}
              />

              <View style={styles.cardInfo}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cuisineTag}>{item.cuisine || 'Authentic'}</Text>
                  <Pressable
                    onPress={() => handleRemove(item)}
                    hitSlop={8}
                    accessibilityLabel="Remove from favorites"
                  >
                    <Ionicons name="heart" size={20} color="#E11D48" />
                  </Pressable>
                </View>

                <Text style={styles.recipeTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.cardMetaRow}>
                  <Badge type={item.isVeg ? 'veg' : 'nonVeg'} />
                  {item.cookTimeMins ? (
                    <View style={styles.metaTime}>
                      <Ionicons name="time-outline" size={13} color={Colors.text.muted} />
                      <Text style={styles.metaTimeText}>{item.cookTimeMins}m</Text>
                    </View>
                  ) : null}
                  {item.difficulty && (
                    <Text style={styles.metaDiffText}>
                      • {item.difficulty}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.DEFAULT,
    backgroundColor: Colors.background.card,
  },
  headerTitleCol: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: Colors.text.DEFAULT,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.background.DEFAULT,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.DEFAULT,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F5F3EC',
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  filterPillActive: {
    backgroundColor: '#EAF5EC',
    borderColor: Colors.primary.DEFAULT,
  },
  filterPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.muted,
  },
  filterPillTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary.DEFAULT,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: 105,
    height: 105,
    backgroundColor: '#EAE5D8',
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cuisineTag: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipeTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
    lineHeight: 19,
    marginVertical: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaTimeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
  },
  metaDiffText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    padding: 16,
  },
  authPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  authIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  authTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: Colors.text.DEFAULT,
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
});
