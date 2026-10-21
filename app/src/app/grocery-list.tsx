import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Share,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@clerk/expo';
import { Colors } from '../constants/theme';
import { IconButton, Button, Badge, Skeleton, EmptyState } from '../components/ui';
import { apiClient } from '../services/api/apiClient';
import { openSwiggyInstamart } from '../lib/swiggy';
import {
  useGroceryLists,
  useGroceryList,
  useCreateGroceryList,
  useAddGroceryListItem,
  useUpdateGroceryListItem,
  useDeleteGroceryListItem,
  useDeleteGroceryList,
  GroceryItemData,
} from '../hooks/useGroceryLists';

const CATEGORY_NAMES: Record<string, string> = {
  Produce: 'Produce & Veggies',
  'Dairy & Protein': 'Dairy, Paneer & Proteins',
  'Pantry & Staples': 'Grains, Oils & Staples',
  'Spices & Seasonings': 'Spices & Seasonings',
  Other: 'Other Essentials',
};

export default function GroceryListScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const { data: lists, isLoading: isLoadingLists } = useGroceryLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Auto-select latest list when lists load
  React.useEffect(() => {
    if (lists && lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);

  const activeListId = selectedListId || (lists && lists[0]?.id);
  const { data: currentList, isLoading: isLoadingList } = useGroceryList(activeListId || undefined);

  const createListMutation = useCreateGroceryList();
  const addItemMutation = useAddGroceryListItem();
  const updateItemMutation = useUpdateGroceryListItem();
  const deleteItemMutation = useDeleteGroceryListItem();
  const deleteListMutation = useDeleteGroceryList();

  // Modal State for adding item
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemCat, setNewItemCat] = useState('Produce');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Group items by category
  const categorizedItems = useMemo(() => {
    if (!currentList?.items) return [];

    const groups: Record<string, GroceryItemData[]> = {
      Produce: [],
      'Dairy & Protein': [],
      'Pantry & Staples': [],
      'Spices & Seasonings': [],
      Other: [],
    };

    for (const item of currentList.items) {
      const cat = item.category || 'Other';
      if (groups[cat]) {
        groups[cat].push(item);
      } else {
        if (!groups['Other']) groups['Other'] = [];
        groups['Other'].push(item);
      }
    }

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [currentList?.items]);

  const totalItems = currentList?.items?.length || 0;
  const purchasedItems = currentList?.items?.filter((i) => i.purchased).length || 0;

  const handleToggleItem = (item: GroceryItemData) => {
    if (!activeListId) return;
    updateItemMutation.mutate({
      listId: activeListId,
      itemId: item.id,
      updates: { purchased: !item.purchased },
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeListId) return;
    deleteItemMutation.mutate({
      listId: activeListId,
      itemId,
    });
  };

  const handleSaveNewItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    if (!activeListId) {
      // Create new list first
      createListMutation.mutate(
        {
          name: 'My Shopping List',
          items: [
            {
              name: trimmed,
              quantity: newItemQty ? parseFloat(newItemQty) : undefined,
              unit: newItemUnit.trim() || undefined,
              category: newItemCat,
            },
          ],
        },
        {
          onSuccess: (data) => {
            setSelectedListId(data.id);
            setIsAddModalVisible(false);
            setNewItemName('');
            setNewItemQty('');
            setNewItemUnit('');
          },
        }
      );
      return;
    }

    addItemMutation.mutate(
      {
        listId: activeListId,
        item: {
          name: trimmed,
          quantity: newItemQty ? parseFloat(newItemQty) : undefined,
          unit: newItemUnit.trim() || undefined,
          category: newItemCat,
        },
      },
      {
        onSuccess: () => {
          setIsAddModalVisible(false);
          setNewItemName('');
          setNewItemQty('');
          setNewItemUnit('');
        },
      }
    );
  };

  const handleCopyList = async () => {
    if (!currentList?.items?.length) return;

    const lines: string[] = [`🛒 AajKyaBanaye — ${currentList.name}`, ''];
    categorizedItems.forEach(([cat, items]) => {
      lines.push(`📦 ${cat.toUpperCase()}:`);
      items.forEach((it) => {
        const mark = it.purchased ? '✓' : '•';
        const qty = it.quantity ? ` (${it.quantity}${it.unit ? ` ${it.unit}` : ''})` : '';
        lines.push(`  ${mark} ${it.name}${qty}`);
      });
      lines.push('');
    });
    lines.push('✨ Generated by AajKyaBanaye');

    const formatted = lines.join('\n');
    await Clipboard.setStringAsync(formatted);
    setCopyFeedback('✅ Copied shopping list to clipboard!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleShareList = async () => {
    if (!currentList?.items?.length) return;

    const lines: string[] = [`🛒 AajKyaBanaye — ${currentList.name}`, ''];
    categorizedItems.forEach(([cat, items]) => {
      lines.push(`📦 ${cat.toUpperCase()}:`);
      items.forEach((it) => {
        const mark = it.purchased ? '✓' : '•';
        const qty = it.quantity ? ` (${it.quantity}${it.unit ? ` ${it.unit}` : ''})` : '';
        lines.push(`  ${mark} ${it.name}${qty}`);
      });
      lines.push('');
    });
    lines.push('✨ Generated by AajKyaBanaye');

    await Share.share({
      title: currentList.name,
      message: lines.join('\n'),
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
          <Text style={styles.headerTitle}>My Grocery Lists</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.authPromptContainer}>
          <View style={styles.authIconCircle}>
            <Ionicons name="cart" size={36} color={Colors.primary.DEFAULT} />
          </View>
          <Text style={styles.authTitle}>Smart Kitchen Grocery Lists</Text>
          <Text style={styles.authSubtitle}>
            Sign in to create, organize, and check off your pantry and recipe shopping items in real time.
          </Text>
          <Button
            title="Sign In to Manage Lists"
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
          <Text style={styles.headerTitle}>{currentList?.name || 'My Grocery List'}</Text>
          {totalItems > 0 && (
            <Text style={styles.headerSubtitle}>
              {purchasedItems}/{totalItems} purchased
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <IconButton
            icon={<Ionicons name="share-outline" size={20} color={Colors.text.DEFAULT} />}
            onPress={handleShareList}
            variant="card"
            size="sm"
            accessibilityLabel="Share list"
            disabled={totalItems === 0}
            style={{ marginRight: 6 }}
          />
          <IconButton
            icon={<Ionicons name="add" size={22} color="#FFFFFF" />}
            onPress={() => setIsAddModalVisible(true)}
            variant="primary"
            size="sm"
            accessibilityLabel="Add ingredient"
          />
        </View>
      </View>

      {/* Multiple lists selector tabs if user has more than 1 list */}
      {lists && lists.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listTabsScroll}
        >
          {lists.map((l) => {
            const isSelected = l.id === activeListId;
            return (
              <Pressable
                key={l.id}
                onPress={() => setSelectedListId(l.id)}
                style={[styles.listTab, isSelected && styles.listTabActive]}
              >
                <Text style={[styles.listTabText, isSelected && styles.listTabTextActive]}>
                  {l.name} ({l.itemCount})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Copy notification */}
      {copyFeedback && (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{copyFeedback}</Text>
        </View>
      )}

      {/* Progress Card */}
      {totalItems > 0 && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Shopping Progress</Text>
            <Text style={styles.progressPercent}>
              {Math.round((purchasedItems / totalItems) * 100)}% ({purchasedItems}/{totalItems})
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(purchasedItems / totalItems) * 100}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* List Content */}
      {isLoadingList || isLoadingLists ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} width="100%" height={52} borderRadius={12} style={{ marginBottom: 10 }} />
          ))}
        </View>
      ) : !currentList || totalItems === 0 ? (
        <EmptyState
          title="Your grocery list is empty"
          message="Add individual spices, produce, or staples, or add recipes directly from your Meal Planner!"
          actionTitle="Add First Item"
          onActionPress={() => setIsAddModalVisible(true)}
          iconName="basket-outline"
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {categorizedItems.map(([catName, items]) => (
            <View key={catName} style={styles.categoryBlock}>
              <View style={styles.catHeaderRow}>
                <Text style={styles.categoryTitle}>{CATEGORY_NAMES[catName] || catName}</Text>
                <Text style={styles.categoryCount}>{items.length}</Text>
              </View>

              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleToggleItem(item)}
                  style={[styles.itemCard, item.purchased && styles.itemCardPurchased]}
                >
                  <View style={[styles.checkbox, item.purchased && styles.checkboxActive]}>
                    {item.purchased && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>

                  <View style={styles.itemTextCol}>
                    <Text style={[styles.itemName, item.purchased && styles.itemNamePurchased]}>
                      {item.name}
                    </Text>
                    {item.quantity ? (
                      <Text style={styles.itemQuantity}>
                        {item.quantity} {item.unit || ''}
                      </Text>
                    ) : null}
                    {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
                  </View>

                  <Pressable
                    onPress={() => handleDeleteItem(item.id)}
                    style={styles.deleteBtn}
                    hitSlop={8}
                    accessibilityLabel="Delete item"
                  >
                    <Ionicons name="trash-outline" size={17} color="#DC2626" />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Floating Bottom Action Bar */}
      {totalItems > 0 && (
        <View style={styles.bottomBar}>
          <Button
            title="Copy List"
            onPress={handleCopyList}
            variant="outline"
            size="md"
            icon={<Ionicons name="copy-outline" size={16} color={Colors.primary.DEFAULT} />}
            style={{ flex: 0.9, marginRight: 8 }}
          />
          <Button
            title="Order on Instamart"
            onPress={async () => {
              if (!currentList?.items?.length) return;
              try {
                const lines = [
                  `🛒 Shopping List: ${currentList.name}`,
                  '',
                  ...currentList.items.map(
                    (it) => `• ${it.name}${it.quantity ? ` (${it.quantity} ${it.unit || ''})` : ''}`
                  ),
                  '',
                  '✨ AajKyaBanaye',
                ];
                await Clipboard.setStringAsync(lines.join('\n'));
                
                // Also notify server to prepare pricing/matching
                apiClient.prepareShoppingList({
                  items: currentList.items.map((it) => ({
                    id: it.id,
                    name: it.name,
                    quantity: it.quantity,
                    unit: it.unit,
                    category: it.category,
                  })),
                  meta: { recipeTitle: currentList.name },
                  providerId: 'instamart',
                }).catch(() => {});

                Alert.alert(
                  'Shopping List Copied! 📋',
                  `All ${currentList.items.length} items copied with quantities. Opening Swiggy Instamart now...`,
                  [
                    {
                      text: 'Open Swiggy',
                      onPress: () => openSwiggyInstamart(),
                    },
                  ]
                );
                await openSwiggyInstamart();
              } catch (e) {
                await openSwiggyInstamart();
              }
            }}
            variant="primary"
            size="md"
            icon={<Ionicons name="flash" size={16} color="#FFFFFF" />}
            style={{ flex: 1.35, backgroundColor: '#FF5200' }}
          />
        </View>
      )}

      {/* Add Item Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Grocery Item</Text>
              <IconButton
                icon={<Ionicons name="close" size={20} color={Colors.text.DEFAULT} />}
                onPress={() => setIsAddModalVisible(false)}
                variant="ghost"
                size="sm"
                accessibilityLabel="Close modal"
              />
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="e.g. Fresh Paneer, Tomatoes, Haldi"
                placeholderTextColor={Colors.text.muted}
                style={styles.textInput}
                autoFocus
              />

              <View style={styles.qtyRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    value={newItemQty}
                    onChangeText={setNewItemQty}
                    placeholder="e.g. 500, 2"
                    placeholderTextColor={Colors.text.muted}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput
                    value={newItemUnit}
                    onChangeText={setNewItemUnit}
                    placeholder="e.g. g, kg, pcs, box"
                    placeholderTextColor={Colors.text.muted}
                    style={styles.textInput}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryPills}>
                {['Produce', 'Dairy & Protein', 'Pantry & Staples', 'Spices & Seasonings', 'Other'].map(
                  (cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setNewItemCat(cat)}
                      style={[styles.catPill, newItemCat === cat && styles.catPillActive]}
                    >
                      <Text
                        style={[styles.catPillText, newItemCat === cat && styles.catPillTextActive]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <Button
                title="Add to Shopping List"
                onPress={handleSaveNewItem}
                disabled={!newItemName.trim() || addItemMutation.isPending}
                loading={addItemMutation.isPending}
                variant="primary"
                size="md"
                style={{ marginTop: 16 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.DEFAULT,
  },
  headerTitleCol: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text.DEFAULT,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listTabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background.DEFAULT,
    gap: 8,
  },
  listTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F5F3EC',
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  listTabActive: {
    backgroundColor: '#EAF5EC',
    borderColor: Colors.primary.DEFAULT,
  },
  listTabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.muted,
  },
  listTabTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary.DEFAULT,
  },
  feedbackBanner: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  feedbackText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#065F46',
  },
  progressCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.text.DEFAULT,
  },
  progressPercent: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.primary.DEFAULT,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EAE5D8',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary.DEFAULT,
  },
  loadingContainer: {
    padding: 16,
  },
  scrollList: {
    padding: 16,
  },
  categoryBlock: {
    marginBottom: 20,
  },
  catHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.muted,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  itemCardPurchased: {
    opacity: 0.6,
    backgroundColor: '#F7F5EE',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#248A3D',
    borderColor: '#248A3D',
  },
  itemTextCol: {
    flex: 1,
  },
  itemName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text.DEFAULT,
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
    color: Colors.text.muted,
  },
  itemQuantity: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  itemNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginLeft: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: Colors.text.DEFAULT,
  },
  modalBody: {},
  inputLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text.DEFAULT,
    backgroundColor: '#F5F3EC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  qtyRow: {
    flexDirection: 'row',
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  catPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F5F3EC',
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  catPillActive: {
    backgroundColor: '#EAF5EC',
    borderColor: Colors.primary.DEFAULT,
  },
  catPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.text.muted,
  },
  catPillTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary.DEFAULT,
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
    backgroundColor: '#EAF5EC',
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
