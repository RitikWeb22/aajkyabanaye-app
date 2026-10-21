import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import {
  Button,
  IconButton,
  Input,
  Badge,
  SearchBar,
  Rating,
  CategoryCard,
  PromoBanner,
  IngredientCheckbox,
  QuantityStepper,
  Skeleton,
  EmptyState,
  ErrorState,
  Dialog,
  BottomSheet,
  Toast,
} from '../components/ui';
import { RecipeCard } from '../components/recipe/RecipeCard';

export default function ComponentGalleryScreen() {
  const router = useRouter();

  // State for interactive testing
  const [searchValue, setSearchValue] = useState('Butter Chicken');
  const [inputValue, setInputValue] = useState('Ritik');
  const [stepperValue, setStepperValue] = useState(4);
  const [ingChecked, setIngChecked] = useState(true);
  const [ingHave, setIngHave] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [favActive, setFavActive] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={Colors.text.DEFAULT} />}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          variant="card"
          size="sm"
        />
        <Text style={styles.headerTitle}>Design System Gallery</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Buttons Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Buttons</Text>
          <View style={styles.rowWrap}>
            <Button title="Primary (Forest)" onPress={() => {}} variant="primary" size="md" />
            <Button title="Secondary" onPress={() => {}} variant="secondary" size="md" />
            <Button title="Accent (Saffron)" onPress={() => {}} variant="accent" size="md" />
            <Button title="Outline" onPress={() => {}} variant="outline" size="md" />
            <Button title="Ghost" onPress={() => {}} variant="ghost" size="md" />
            <Button title="Danger" onPress={() => {}} variant="danger" size="md" />
            <Button title="Loading" onPress={() => {}} variant="primary" loading size="md" />
            <Button title="Disabled" onPress={() => {}} variant="primary" disabled size="md" />
            <Button
              title="With Icon"
              onPress={() => {}}
              variant="primary"
              size="md"
              icon={<Ionicons name="sparkles" size={16} color="#FFFFFF" />}
            />
          </View>
        </View>

        {/* IconButtons Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Icon Buttons</Text>
          <View style={styles.row}>
            <IconButton
              icon={<Ionicons name="heart" size={20} color="#FFFFFF" />}
              onPress={() => {}}
              variant="primary"
              accessibilityLabel="Heart"
            />
            <IconButton
              icon={<Ionicons name="share-social-outline" size={20} color={Colors.primary.DEFAULT} />}
              onPress={() => {}}
              variant="card"
              accessibilityLabel="Share"
            />
            <IconButton
              icon={<Ionicons name="cart-outline" size={20} color={Colors.primary.DEFAULT} />}
              onPress={() => {}}
              variant="card"
              badgeCount={3}
              accessibilityLabel="Cart with 3 items"
            />
            <IconButton
              icon={<Ionicons name="bookmark-outline" size={20} color={Colors.primary.DEFAULT} />}
              onPress={() => {}}
              variant="outline"
              accessibilityLabel="Bookmark"
            />
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Badges & Indicators</Text>
          <View style={styles.rowWrap}>
            <Badge type="veg" />
            <Badge type="nonVeg" />
            <Badge type="ai" />
            <Badge type="time" timeMins={25} />
            <Badge type="difficulty" difficulty="easy" />
            <Badge type="difficulty" difficulty="medium" />
            <Badge type="difficulty" difficulty="hard" />
            <Badge label="North Indian" />
            <Badge label="Gluten-Free" />
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Rating</Text>
          <View style={styles.row}>
            <Rating value={4.8} count={142} size="md" />
            <Rating value={4.5} size="sm" />
          </View>
        </View>

        {/* Inputs Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5. Form Inputs</Text>
          <Input
            label="Chef Name"
            placeholder="Enter your name"
            value={inputValue}
            onChangeText={setInputValue}
            leftIcon={<Ionicons name="person-outline" size={18} color={Colors.text.muted} />}
          />
          <Input
            label="Secret Recipe Password"
            placeholder="Enter password"
            value="secret123"
            onChangeText={() => {}}
            isPassword
          />
          <Input
            label="Input with Error"
            placeholder="Type something"
            value="invalid-email@"
            error="Please provide a valid email address."
            onChangeText={() => {}}
          />
        </View>

        {/* SearchBar Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>6. SearchBar</Text>
          <SearchBar
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search any dish or curry..."
            hasActiveFilters
            onFilterPress={() => {}}
          />
        </View>

        {/* Category Cards */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>7. Category Chips</Text>
          <View style={styles.rowWrap}>
            <CategoryCard id="1" name="Breakfast" isActive onPress={() => {}} />
            <CategoryCard id="2" name="Quick Dinners" onPress={() => {}} />
            <CategoryCard id="3" name="High Protein" onPress={() => {}} />
          </View>
        </View>

        {/* PromoBanner */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>8. Promo Banner</Text>
          <PromoBanner
            badgeText="Festival Special"
            title="Diwali Sweets & Snacks"
            subtitle="Authentic homemade Indian desserts in under 30 minutes."
            buttonText="View Collection"
            onPress={() => {}}
          />
        </View>

        {/* Recipe Cards */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>9. Recipe Cards (Vertical & Horizontal)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <RecipeCard
              id="gal-1"
              title="Paneer Tikka Masala"
              cuisine="North Indian"
              cookTimeMins={35}
              servings={4}
              difficulty="easy"
              isVeg
              rating={{ value: 4.8, count: 210 }}
              isFavorite={favActive}
              onPress={() => {}}
              onToggleFavorite={() => setFavActive(!favActive)}
              variant="vertical"
              image="https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80"
            />
            <RecipeCard
              id="gal-2"
              title="AI Crafted Spinach Garlic Soup"
              cuisine="Fusion"
              cookTimeMins={15}
              servings={2}
              difficulty="easy"
              isVeg
              isAiGenerated
              onPress={() => {}}
              variant="vertical"
            />
          </ScrollView>

          <RecipeCard
            id="gal-3"
            title="Dal Makhani with Garlic Naan"
            cuisine="Punjabi"
            cookTimeMins={45}
            servings={3}
            difficulty="medium"
            isVeg
            rating={{ value: 4.9, count: 480 }}
            onPress={() => {}}
            variant="horizontal"
            image="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80"
          />
        </View>

        {/* Ingredient Checkbox & Stepper */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>10. Ingredient Checkbox & Quantity Stepper</Text>
          <View style={{ marginBottom: 12 }}>
            <QuantityStepper
              value={stepperValue}
              onChange={setStepperValue}
              unitLabel="servings"
            />
          </View>
          <IngredientCheckbox
            id="ing-1"
            name="Fresh Tomatoes"
            quantity={4}
            unit="pcs"
            checked={ingChecked}
            alreadyHave={ingHave}
            onToggleCheck={() => setIngChecked(!ingChecked)}
            onToggleAlreadyHave={() => setIngHave(!ingHave)}
          />
        </View>

        {/* Skeletons */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>11. Skeleton Shimmer Loaders</Text>
          <Skeleton height={120} borderRadius={18} style={{ marginBottom: 10 }} />
          <Skeleton height={20} width="70%" style={{ marginBottom: 6 }} />
          <Skeleton height={16} width="40%" />
        </View>

        {/* Modals & Dialogs Triggers */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>12. Dialog, Sheet & Toast Triggers</Text>
          <View style={styles.rowWrap}>
            <Button
              title="Show Dialog"
              onPress={() => setDialogVisible(true)}
              variant="outline"
              size="sm"
            />
            <Button
              title="Open BottomSheet"
              onPress={() => setSheetVisible(true)}
              variant="outline"
              size="sm"
            />
            <Button
              title="Trigger Toast"
              onPress={() => setToastVisible(true)}
              variant="outline"
              size="sm"
            />
          </View>
        </View>

        {/* States Preview */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>13. Empty & Error States</Text>
          <EmptyState
            title="No recipes found"
            message="Try searching with different ingredients or generate a custom recipe with AI."
            actionTitle="Generate with AI"
            onActionPress={() => {}}
          />
          <View style={{ height: 20 }} />
          <ErrorState
            onRetry={() => {}}
          />
        </View>
      </ScrollView>

      {/* Interactive Modals */}
      <Dialog
        visible={dialogVisible}
        title="Clear Selected Ingredients?"
        message="This will reset your checklist for this recipe."
        confirmText="Yes, Clear"
        confirmVariant="danger"
        onConfirm={() => setDialogVisible(false)}
        onCancel={() => setDialogVisible(false)}
      />

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Review Shopping Items"
      >
        <Text style={{ fontFamily: 'Inter_400Regular', color: Colors.text.muted, marginBottom: 14 }}>
          Items to be prepared for copying or shopping:
        </Text>
        <IngredientCheckbox
          id="sheet-1"
          name="Paneer Cubes"
          quantity={250}
          unit="g"
          checked={true}
          onToggleCheck={() => {}}
        />
        <IngredientCheckbox
          id="sheet-2"
          name="Fresh Cream"
          quantity={100}
          unit="ml"
          checked={true}
          onToggleCheck={() => {}}
        />
        <Button
          title="Confirm & Copy List"
          onPress={() => setSheetVisible(false)}
          variant="primary"
          size="md"
          fullWidth
          style={{ marginTop: 12 }}
        />
      </BottomSheet>

      <Toast
        visible={toastVisible}
        message="Shopping list copied to clipboard!"
        type="success"
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.DEFAULT,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.text.DEFAULT,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.primary.DEFAULT,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
