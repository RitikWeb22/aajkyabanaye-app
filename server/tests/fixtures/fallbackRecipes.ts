import { Recipe } from '../../src/types/recipe.js';

/**
 * DEV/TEST FALLBACK RECIPES ONLY
 * 
 * Per AGENTS.md Phase 4:
 * "Seed fallback data only for tests/dev, clearly separated and never shown as live data."
 * 
 * Used exclusively for automated test suites, offline schema testing, and unit tests.
 * Never returned as live provider data without explicit test indicator.
 */
export const DEV_TEST_FALLBACK_RECIPES: Recipe[] = [
  {
    id: 'test:paneer-butter-masala',
    source: 'custom',
    externalId: 'test-pbm-001',
    title: 'Paneer Butter Masala (Dev Test)',
    description: 'A rich and creamy North Indian curry with succulent cottage cheese cubes simmered in spiced tomato gravy.',
    image: 'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg',
    cuisine: 'Indian',
    category: 'dinner',
    dietary: {
      vegetarian: true,
      vegan: false,
      glutenFree: true,
      tags: ['Indian', 'Vegetarian', 'Curry', 'DevTest'],
    },
    prepTimeMins: 15,
    cookTimeMins: 30,
    servings: 4,
    difficulty: 'medium',
    ingredients: [
      { id: 'ing_1', name: 'Paneer', quantity: 250, unit: 'g', groceryTerm: 'Paneer', category: 'Dairy' },
      { id: 'ing_2', name: 'Butter', quantity: 2, unit: 'tbsp', groceryTerm: 'Butter', category: 'Dairy' },
      { id: 'ing_3', name: 'Tomatoes', quantity: 4, unit: 'pcs', groceryTerm: 'Tomatoes', category: 'Produce' },
      { id: 'ing_4', name: 'Cashews', quantity: 12, unit: 'pcs', groceryTerm: 'Cashews', category: 'Pantry' },
      { id: 'ing_5', name: 'Heavy Cream', quantity: 3, unit: 'tbsp', groceryTerm: 'Cream', category: 'Dairy' },
      { id: 'ing_6', name: 'Kashmiri Red Chilli Powder', quantity: 1, unit: 'tsp', groceryTerm: 'Red Chilli Powder', category: 'Spices' },
      { id: 'ing_7', name: 'Garam Masala', quantity: 0.5, unit: 'tsp', groceryTerm: 'Garam Masala', category: 'Spices' },
      { id: 'ing_8', name: 'Kasuri Methi', quantity: 1, unit: 'tsp', groceryTerm: 'Dried Fenugreek Leaves', category: 'Spices' },
      { id: 'ing_9', name: 'Salt', unit: 'to_taste', note: 'to taste', groceryTerm: 'Salt', category: 'Spices' },
    ],
    steps: [
      { order: 1, text: 'Soak cashews in warm water for 15 minutes, then blend with tomatoes to a smooth purée.' },
      { order: 2, text: 'Melt butter in a heavy kadai over medium heat, add ginger-garlic paste and sauté until aromatic.' },
      { order: 3, text: 'Pour in the tomato-cashew purée and cook until fat separates from the masala (8–10 minutes).' },
      { order: 4, text: 'Add spices, salt, and gently slide in the paneer cubes. Simmer on low heat for 5 minutes.' },
      { order: 5, text: 'Finish with crushed kasuri methi and fresh cream. Serve hot with naan or jeera rice.' },
    ],
    rating: {
      value: 4.8,
      count: 142,
    },
    attribution: {
      providerName: 'Dev Seed Fallback',
      url: 'https://github.com/aajkyabanaye',
      license: 'Internal Test Fixture',
    },
    isAiGenerated: false,
  },
  {
    id: 'test:dal-tadka',
    source: 'custom',
    externalId: 'test-dt-002',
    title: 'Yellow Dal Tadka (Dev Test)',
    description: 'Comforting yellow lentils cooked with turmeric and tempered with cumin, garlic, and ghee.',
    image: 'https://www.themealdb.com/images/media/meals/wuxrtu1483564410.jpg',
    cuisine: 'Indian',
    category: 'lunch',
    dietary: {
      vegetarian: true,
      vegan: false,
      glutenFree: true,
      tags: ['Indian', 'Vegetarian', 'High-Protein', 'DevTest'],
    },
    prepTimeMins: 10,
    cookTimeMins: 25,
    servings: 4,
    difficulty: 'easy',
    ingredients: [
      { id: 'ing_1', name: 'Toor Dal (Pigeon Peas)', quantity: 1, unit: 'cup', groceryTerm: 'Toor Dal', category: 'Grains' },
      { id: 'ing_2', name: 'Ghee', quantity: 2, unit: 'tbsp', groceryTerm: 'Desi Ghee', category: 'Dairy' },
      { id: 'ing_3', name: 'Cumin Seeds', quantity: 1, unit: 'tsp', groceryTerm: 'Jeera', category: 'Spices' },
      { id: 'ing_4', name: 'Garlic', quantity: 5, unit: 'pcs', note: 'cloves, sliced', groceryTerm: 'Garlic', category: 'Produce' },
      { id: 'ing_5', name: 'Turmeric Powder', quantity: 0.5, unit: 'tsp', groceryTerm: 'Haldi', category: 'Spices' },
      { id: 'ing_6', name: 'Fresh Coriander', quantity: 2, unit: 'tbsp', note: 'chopped', groceryTerm: 'Coriander', category: 'Produce' },
    ],
    steps: [
      { order: 1, text: 'Pressure cook toor dal with water, turmeric, and salt for 3–4 whistles until tender.' },
      { order: 2, text: 'Whisk the dal lightly to achieve a velvety consistency.' },
      { order: 3, text: 'Heat ghee in a small pan, crackle cumin seeds, then fry sliced garlic and dried red chilies until golden.' },
      { order: 4, text: 'Pour the sizzling tadka immediately over the hot dal and garnish with chopped coriander.' },
    ],
    rating: {
      value: 4.6,
      count: 98,
    },
    attribution: {
      providerName: 'Dev Seed Fallback',
      url: 'https://github.com/aajkyabanaye',
      license: 'Internal Test Fixture',
    },
    isAiGenerated: false,
  },
];
