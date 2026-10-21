import { Recipe, RecipeProvider, SearchParams, Paged } from '../../types/recipe.js';

export const POPULAR_INDIAN_CATALOG: Recipe[] = [
  // --- MOMOS ---
  {
    id: 'custom:veg-steamed-momos',
    source: 'custom',
    externalId: 'veg-steamed-momos',
    title: 'Authentic Tibetan Veg Steamed Momos',
    description: 'Juicy Tibetan style steamed dumplings stuffed with finely minced cabbage, carrots, onions, ginger, and garlic, served with fiery spicy red momos chutney.',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=80',
    cuisine: 'Tibetan',
    category: 'snack',
    dietary: {
      vegetarian: true,
      vegan: true,
      glutenFree: false,
      tags: ['Street Food', 'Snack', 'Popular', 'Steamed'],
    },
    prepTimeMins: 25,
    cookTimeMins: 15,
    servings: 3,
    difficulty: 'medium',
    ingredients: [
      { id: 'ing_momo_1', name: 'Maida (All Purpose Flour)', quantity: 200, unit: 'g', groceryTerm: 'Maida flour' },
      { id: 'ing_momo_2', name: 'Finely Shredded Cabbage', quantity: 150, unit: 'g', groceryTerm: 'Fresh cabbage' },
      { id: 'ing_momo_3', name: 'Grated Carrot', quantity: 1, unit: 'pcs', groceryTerm: 'Fresh carrots' },
      { id: 'ing_momo_4', name: 'Finely Chopped Onion', quantity: 1, unit: 'pcs', groceryTerm: 'Fresh onion' },
      { id: 'ing_momo_5', name: 'Minced Ginger & Garlic', quantity: 1.5, unit: 'tbsp', groceryTerm: 'Ginger garlic paste' },
      { id: 'ing_momo_6', name: 'Soy Sauce', quantity: 1, unit: 'tbsp', groceryTerm: 'Dark soy sauce' },
      { id: 'ing_momo_7', name: 'Black Pepper Powder', quantity: 0.5, unit: 'tsp', groceryTerm: 'Black pepper' },
      { id: 'ing_momo_8', name: 'Cooking Oil', quantity: 1, unit: 'tbsp', groceryTerm: 'Refined sunflower oil' },
      { id: 'ing_momo_9', name: 'Salt', unit: 'to_taste', note: 'As required', groceryTerm: 'Table salt' },
    ],
    steps: [
      { order: 1, text: 'Knead the maida with water and a pinch of salt into a smooth, pliable dough. Cover with a damp cloth and rest for 20 minutes.' },
      { order: 2, text: 'In a mixing bowl, combine shredded cabbage, carrot, onion, minced ginger, garlic, soy sauce, black pepper, and oil. Squeeze out excess moisture.' },
      { order: 3, text: 'Divide dough into small lime-sized balls. Roll each ball into a very thin translucent circle with edges thinner than the center.' },
      { order: 4, text: 'Place 1 tablespoon of veggie filling in the center. Pleat the edges together tightly and seal the top.' },
      { order: 5, text: 'Grease a steamer plate with oil. Steam momos on high heat for 10-12 minutes until the skin becomes glossy and non-sticky.' },
      { order: 6, text: 'Serve piping hot with authentic spicy red garlic chili chutney.' },
    ],
    tips: [
      'Roll the momo sheet edges thinner than the center so the base does not tear.',
      'Do not over-steam, or the wrappers will turn rubbery.',
    ],
    rating: { value: 4.8, count: 240 },
    isAiGenerated: false,
  },
  {
    id: 'custom:chicken-steamed-momos',
    source: 'custom',
    externalId: 'chicken-steamed-momos',
    title: 'Darjeeling Style Steamed Chicken Momos',
    description: 'Flavor-packed juicy chicken dumplings seasoned with fresh spring onions, coriander, ginger, and melted butter, steamed to soft perfection.',
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80',
    cuisine: 'Tibetan',
    category: 'snack',
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      tags: ['Non-Veg', 'High Protein', 'Street Food', 'Steamed'],
    },
    prepTimeMins: 20,
    cookTimeMins: 15,
    servings: 3,
    difficulty: 'medium',
    ingredients: [
      { id: 'ing_cmomo_1', name: 'Minced Chicken (Keema)', quantity: 300, unit: 'g', groceryTerm: 'Chicken mince keema' },
      { id: 'ing_cmomo_2', name: 'Maida (All Purpose Flour)', quantity: 200, unit: 'g', groceryTerm: 'Maida' },
      { id: 'ing_cmomo_3', name: 'Finely Chopped Onion', quantity: 1, unit: 'pcs', groceryTerm: 'Fresh onion' },
      { id: 'ing_cmomo_4', name: 'Chopped Spring Onions', quantity: 3, unit: 'tbsp', groceryTerm: 'Spring onion' },
      { id: 'ing_cmomo_5', name: 'Finely Minced Ginger & Garlic', quantity: 2, unit: 'tbsp', groceryTerm: 'Ginger garlic' },
      { id: 'ing_cmomo_6', name: 'Melted Butter or Oil', quantity: 1.5, unit: 'tbsp', groceryTerm: 'Amul butter' },
      { id: 'ing_cmomo_7', name: 'Soy Sauce', quantity: 1, unit: 'tbsp', groceryTerm: 'Soy sauce' },
      { id: 'ing_cmomo_8', name: 'Salt & Crushed Black Pepper', unit: 'to_taste', groceryTerm: 'Black pepper' },
    ],
    steps: [
      { order: 1, text: 'Knead maida with water and salt into a firm dough; rest covered for 20 minutes.' },
      { order: 2, text: 'In a bowl, mix minced chicken, onion, spring onion, ginger, garlic, soy sauce, melted butter, salt, and pepper thoroughly.' },
      { order: 3, text: 'Roll small portions of dough into thin round discs with thin edges.' },
      { order: 4, text: 'Place a spoonful of juicy chicken stuffing, pleat clockwise, and twist the top to lock the juices inside.' },
      { order: 5, text: 'Steam in a greased steamer for 12 to 14 minutes until chicken is completely tender and fragrant.' },
      { order: 6, text: 'Serve hot with spicy red momo sauce and clear chicken thukpa soup.' },
    ],
    tips: ['Adding melted butter to chicken mince ensures the filling stays super juicy.'],
    rating: { value: 4.9, count: 310 },
    isAiGenerated: false,
  },
  {
    id: 'custom:crispy-fried-momos',
    source: 'custom',
    externalId: 'crispy-fried-momos',
    title: 'Crispy Kurkure Fried Momos',
    description: 'Golden crunchy deep-fried dumplings coated with spicy seasoning, crispy on the outside and wonderfully juicy inside.',
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&auto=format&fit=crop&q=80',
    cuisine: 'Street Food',
    category: 'snack',
    dietary: {
      vegetarian: true,
      vegan: true,
      glutenFree: false,
      tags: ['Crispy', 'Fried', 'Street Food'],
    },
    prepTimeMins: 20,
    cookTimeMins: 15,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      { id: 'ing_fmomo_1', name: 'Prepared Steamed Momos', quantity: 10, unit: 'pcs', groceryTerm: 'Frozen momos' },
      { id: 'ing_fmomo_2', name: 'Cooking Oil for Frying', quantity: 300, unit: 'ml', groceryTerm: 'Refined cooking oil' },
      { id: 'ing_fmomo_3', name: 'Chaat Masala', quantity: 1, unit: 'tsp', groceryTerm: 'Everest chaat masala' },
      { id: 'ing_fmomo_4', name: 'Mayonnaise & Schezwan Chutney', quantity: 2, unit: 'tbsp', groceryTerm: 'Schezwan sauce' },
    ],
    steps: [
      { order: 1, text: 'Heat oil in a deep kadai over medium heat until hot.' },
      { order: 2, text: 'Gently slide steamed or thawed momos into the oil in batches.' },
      { order: 3, text: 'Fry for 3-4 minutes, turning occasionally until golden brown and super crunchy.' },
      { order: 4, text: 'Drain on kitchen paper and sprinkle generously with chaat masala.' },
      { order: 5, text: 'Serve hot with spicy schezwan chutney and mayonnaise.' },
    ],
    rating: { value: 4.7, count: 180 },
    isAiGenerated: false,
  },

  // --- CHICKEN DISHES ---
  {
    id: 'custom:butter-chicken',
    source: 'custom',
    externalId: 'butter-chicken',
    title: 'Dilli 6 Restaurant Style Butter Chicken (Murgh Makhani)',
    description: 'Tender marinated chicken tikka simmered in a velvety, buttery tomato cashew makhani gravy infused with kasuri methi.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80',
    cuisine: 'North Indian',
    category: 'dinner',
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      tags: ['Non-Veg', 'Creamy', 'North Indian', 'Curry'],
    },
    prepTimeMins: 20,
    cookTimeMins: 25,
    servings: 4,
    difficulty: 'medium',
    ingredients: [
      { id: 'ing_bc_1', name: 'Boneless Chicken Thighs or Breast', quantity: 500, unit: 'g', groceryTerm: 'Boneless chicken' },
      { id: 'ing_bc_2', name: 'Ripe Red Tomatoes (pureed)', quantity: 4, unit: 'pcs', groceryTerm: 'Fresh tomatoes' },
      { id: 'ing_bc_3', name: 'Cashew Nuts', quantity: 15, unit: 'pcs', groceryTerm: 'Kaju cashews' },
      { id: 'ing_bc_4', name: 'Butter', quantity: 40, unit: 'g', groceryTerm: 'Amul butter' },
      { id: 'ing_bc_5', name: 'Fresh Cream', quantity: 3, unit: 'tbsp', groceryTerm: 'Fresh cream' },
      { id: 'ing_bc_6', name: 'Ginger Garlic Paste', quantity: 2, unit: 'tbsp', groceryTerm: 'Ginger garlic paste' },
      { id: 'ing_bc_7', name: 'Kashmiri Red Chilli Powder', quantity: 1.5, unit: 'tbsp', groceryTerm: 'Kashmiri red chilli' },
      { id: 'ing_bc_8', name: 'Kasuri Methi (Fenugreek leaves)', quantity: 1, unit: 'tbsp', groceryTerm: 'Kasuri methi' },
      { id: 'ing_bc_9', name: 'Garam Masala', quantity: 1, unit: 'tsp', groceryTerm: 'Garam masala' },
      { id: 'ing_bc_10', name: 'Salt & Sugar', unit: 'to_taste', note: 'Balance tomato acidity with pinch of sugar', groceryTerm: 'Sugar' },
    ],
    steps: [
      { order: 1, text: 'Marinate chicken with yogurt, ginger garlic paste, kashmiri chili powder, and salt for 30 minutes.' },
      { order: 2, text: 'Sear chicken pieces in a hot pan with 1 tbsp butter for 6-8 minutes until slightly charred and cooked through.' },
      { order: 3, text: 'Boil tomatoes and cashews together in 1/2 cup water, cool, and blend into a silky smooth puree.' },
      { order: 4, text: 'Melt remaining butter in a pan, add the tomato cashew puree, kashmiri chili powder, garam masala, and simmer on low heat for 10 minutes.' },
      { order: 5, text: 'Add cooked chicken pieces and simmer for 5 minutes. Stir in fresh cream and crushed kasuri methi.' },
      { order: 6, text: 'Serve hot with garlic butter naan, tandoori roti, or jeera rice.' },
    ],
    tips: ['Strain the tomato-cashew puree through a sieve for that signature silky restaurant texture.'],
    rating: { value: 4.9, count: 520 },
    isAiGenerated: false,
  },
  {
    id: 'custom:hyderabadi-chicken-biryani',
    source: 'custom',
    externalId: 'hyderabadi-chicken-biryani',
    title: 'Authentic Hyderabadi Chicken Dum Biryani',
    description: 'Fragrant long-grain aged Basmati rice layered with spiced marinated chicken, caramelized fried onions (birista), saffron milk, and fresh mint.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
    cuisine: 'Hyderabadi',
    category: 'dinner',
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      tags: ['Non-Veg', 'Biryani', 'Special', 'Royal'],
    },
    prepTimeMins: 30,
    cookTimeMins: 35,
    servings: 4,
    difficulty: 'hard',
    ingredients: [
      { id: 'ing_bir_1', name: 'Chicken (Bone-in cuts)', quantity: 500, unit: 'g', groceryTerm: 'Curry cut chicken' },
      { id: 'ing_bir_2', name: 'Aged Basmati Rice', quantity: 400, unit: 'g', groceryTerm: 'Basmati rice' },
      { id: 'ing_bir_3', name: 'Curd / Plain Yogurt', quantity: 150, unit: 'g', groceryTerm: 'Fresh dahi curd' },
      { id: 'ing_bir_4', name: 'Sliced Onions (for Birista)', quantity: 3, unit: 'pcs', groceryTerm: 'Red onions' },
      { id: 'ing_bir_5', name: 'Ginger Garlic Paste', quantity: 2, unit: 'tbsp', groceryTerm: 'Ginger garlic' },
      { id: 'ing_bir_6', name: 'Biryani Masala & Whole Spices', quantity: 1.5, unit: 'tbsp', groceryTerm: 'Biryani masala' },
      { id: 'ing_bir_7', name: 'Mint & Fresh Coriander Leaves', quantity: 1, unit: 'cup', groceryTerm: 'Mint coriander' },
      { id: 'ing_bir_8', name: 'Desi Ghee', quantity: 3, unit: 'tbsp', groceryTerm: 'Desi ghee' },
      { id: 'ing_bir_9', name: 'Saffron strands soaked in warm milk', quantity: 3, unit: 'tbsp', groceryTerm: 'Saffron milk' },
    ],
    steps: [
      { order: 1, text: 'Marinate chicken with yogurt, ginger garlic paste, biryani masala, red chili powder, half the fried onions, mint, coriander, and salt for 1 hour.' },
      { order: 2, text: 'Boil water with whole spices and salt. Parboil soaked basmati rice until 70% done, then drain immediately.' },
      { order: 3, text: 'In a heavy-bottomed pot, spread the marinated chicken at the bottom. Layer the parboiled rice evenly on top.' },
      { order: 4, text: 'Garnish top with remaining fried onions, chopped mint, desi ghee, and saffron milk.' },
      { order: 5, text: 'Seal the pot tightly with dough or aluminum foil and lid. Cook on medium heat for 10 mins, then on a hot tawa on low flame for 25 mins (dum).' },
      { order: 6, text: 'Gently fluff the rice from bottom to top and serve with chilled cucumber onion raita and salan.' },
    ],
    rating: { value: 5.0, count: 680 },
    isAiGenerated: false,
  },
  {
    id: 'custom:dhaba-kadai-chicken',
    source: 'custom',
    externalId: 'dhaba-kadai-chicken',
    title: 'Dhaba Style Kadai Chicken',
    description: 'Chicken tossed with freshly pounded kadai spices, crunchy capsicum bell peppers, and chunky onions in a robust semi-dry gravy.',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
    cuisine: 'North Indian',
    category: 'dinner',
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      tags: ['Non-Veg', 'Spicy', 'Dhaba Style'],
    },
    prepTimeMins: 15,
    cookTimeMins: 25,
    servings: 3,
    difficulty: 'medium',
    ingredients: [
      { id: 'ing_kc_1', name: 'Chicken (Curry Cut)', quantity: 450, unit: 'g', groceryTerm: 'Chicken curry cut' },
      { id: 'ing_kc_2', name: 'Capsicum / Green Bell Pepper (Cubed)', quantity: 1, unit: 'pcs', groceryTerm: 'Green capsicum' },
      { id: 'ing_kc_3', name: 'Onion (Cubed)', quantity: 2, unit: 'pcs', groceryTerm: 'Onion' },
      { id: 'ing_kc_4', name: 'Chopped Tomatoes', quantity: 3, unit: 'pcs', groceryTerm: 'Tomatoes' },
      { id: 'ing_kc_5', name: 'Pounded Coriander Seeds & Dry Red Chillies', quantity: 1.5, unit: 'tbsp', groceryTerm: 'Whole coriander seeds' },
      { id: 'ing_kc_6', name: 'Ginger Garlic Paste', quantity: 1.5, unit: 'tbsp', groceryTerm: 'Ginger garlic paste' },
      { id: 'ing_kc_7', name: 'Kasuri Methi', quantity: 1, unit: 'tsp', groceryTerm: 'Kasuri methi' },
      { id: 'ing_kc_8', name: 'Mustard or Refined Oil', quantity: 2, unit: 'tbsp', groceryTerm: 'Mustard oil' },
    ],
    steps: [
      { order: 1, text: 'Coarsely roast and crush whole coriander seeds and dry red chilies to make fresh Kadai Masala.' },
      { order: 2, text: 'Heat oil in a heavy kadai, fry chicken pieces on high heat with ginger garlic paste until lightly browned.' },
      { order: 3, text: 'Add chopped tomatoes and spices, cooking until oil separates from the masala.' },
      { order: 4, text: 'Toss in cubed capsicum and onion petals; stir-fry for 3-4 minutes keeping the peppers crisp.' },
      { order: 5, text: 'Finish with crushed kasuri methi and fresh coriander. Serve hot with butter tandoori roti.' },
    ],
    rating: { value: 4.8, count: 290 },
    isAiGenerated: false,
  },

  // --- EGG DISHES ---
  {
    id: 'custom:egg-bhujiya',
    source: 'custom',
    externalId: 'egg-bhujiya',
    title: 'Dhaba Style Masaledar Egg Bhujiya (Bhurji)',
    description: 'Classic roadside dhaba style scrambled eggs sautéed with onions, green chillies, tomatoes, butter, and fragrant Indian spices.',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
    cuisine: 'North Indian',
    category: 'breakfast',
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      tags: ['Eggs', 'High Protein', 'Quick Meal', '15 mins'],
    },
    prepTimeMins: 5,
    cookTimeMins: 10,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      { id: 'ing_eb_1', name: 'Fresh Farm Eggs', quantity: 4, unit: 'pcs', groceryTerm: 'Farm fresh eggs' },
      { id: 'ing_eb_2', name: 'Finely Chopped Onion', quantity: 2, unit: 'pcs', groceryTerm: 'Fresh onion' },
      { id: 'ing_eb_3', name: 'Chopped Ripe Tomatoes', quantity: 1, unit: 'pcs', groceryTerm: 'Tomatoes' },
      { id: 'ing_eb_4', name: 'Green Chillies (Slit or Chopped)', quantity: 2, unit: 'pcs', groceryTerm: 'Green chilli' },
      { id: 'ing_eb_5', name: 'Finely Minced Ginger', quantity: 1, unit: 'tsp', groceryTerm: 'Ginger' },
      { id: 'ing_eb_6', name: 'Butter or Oil', quantity: 1.5, unit: 'tbsp', groceryTerm: 'Amul butter' },
      { id: 'ing_eb_7', name: 'Turmeric & Kashmiri Red Chili Powder', quantity: 0.5, unit: 'tsp', groceryTerm: 'Haldi powder' },
      { id: 'ing_eb_8', name: 'Pav Bhaji Masala or Garam Masala', quantity: 0.5, unit: 'tsp', groceryTerm: 'Pav bhaji masala' },
      { id: 'ing_eb_9', name: 'Fresh Coriander', quantity: 2, unit: 'tbsp', groceryTerm: 'Coriander leaves' },
    ],
    steps: [
      { order: 1, text: 'Whisk 4 eggs with a pinch of salt and black pepper in a bowl until lightly frothy.' },
      { order: 2, text: 'Heat butter in a pan over medium flame. Sauté chopped onions, ginger, and green chilies until golden translucent.' },
      { order: 3, text: 'Add tomatoes, turmeric, red chili powder, and pav bhaji masala. Cook for 2 minutes until soft and aromatic.' },
      { order: 4, text: 'Pour in the beaten eggs and turn the heat to medium-low.' },
      { order: 5, text: 'Gently fold and scramble the eggs continuously until soft curds form; do not overdry.' },
      { order: 6, text: 'Garnish with fresh coriander and a cube of butter. Serve steaming hot with buttered pav or crispy parathas.' },
    ],
    tips: ['Keep flame low while scrambling eggs to maintain a moist, buttery texture.'],
    rating: { value: 4.9, count: 410 },
    isAiGenerated: false,
  },
  {
    id: 'custom:dhaba-egg-curry',
    source: 'custom',
    externalId: 'dhaba-egg-curry',
    title: 'Dhaba Style Tariwali Egg Curry',
    description: 'Golden shallow-fried boiled eggs simmered in a spiced onion tomato gravy with cumin and aromatic spices.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    cuisine: 'North Indian',
    category: 'dinner',
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      tags: ['Eggs', 'High Protein', 'Homestyle'],
    },
    prepTimeMins: 10,
    cookTimeMins: 20,
    servings: 3,
    difficulty: 'easy',
    ingredients: [
      { id: 'ing_ec_1', name: 'Hard Boiled Eggs', quantity: 6, unit: 'pcs', groceryTerm: 'Farm eggs' },
      { id: 'ing_ec_2', name: 'Finely Chopped Onions', quantity: 2, unit: 'pcs', groceryTerm: 'Onions' },
      { id: 'ing_ec_3', name: 'Pureed Fresh Tomatoes', quantity: 2, unit: 'pcs', groceryTerm: 'Tomatoes' },
      { id: 'ing_ec_4', name: 'Ginger Garlic Paste', quantity: 1, unit: 'tbsp', groceryTerm: 'Ginger garlic paste' },
      { id: 'ing_ec_5', name: 'Cumin Seeds (Jeera)', quantity: 1, unit: 'tsp', groceryTerm: 'Jeera cumin' },
      { id: 'ing_ec_6', name: 'Coriander, Turmeric & Red Chili Powder', quantity: 1.5, unit: 'tbsp', groceryTerm: 'Dhania powder' },
      { id: 'ing_ec_7', name: 'Mustard Oil or Ghee', quantity: 2, unit: 'tbsp', groceryTerm: 'Mustard oil' },
    ],
    steps: [
      { order: 1, text: 'Make gentle slits on boiled eggs. Dust with turmeric and salt, then shallow fry in hot oil until golden blistered.' },
      { order: 2, text: 'In the same oil, crackle cumin seeds, then sauté onions until golden brown.' },
      { order: 3, text: 'Add ginger garlic paste, tomato puree, turmeric, coriander, and chili powder. Cook until oil releases.' },
      { order: 4, text: 'Pour in 1 cup warm water, bring gravy to a simmer, and slide in the golden fried eggs.' },
      { order: 5, text: 'Simmer on low for 6-8 minutes so the eggs absorb the rich masala. Garnish with chopped coriander.' },
    ],
    rating: { value: 4.8, count: 350 },
    isAiGenerated: false,
  },

  // --- PANEER & VEGETARIAN DELICACIES ---
  {
    id: 'custom:paneer-butter-masala',
    source: 'custom',
    externalId: 'paneer-butter-masala',
    title: 'Restaurant Style Paneer Butter Masala',
    description: 'Melt-in-mouth cottage cheese cubes cooked in a silky, mildly sweet and rich tomato-cashew makhani gravy.',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80',
    cuisine: 'North Indian',
    category: 'dinner',
    dietary: {
      vegetarian: true,
      vegan: false,
      glutenFree: true,
      tags: ['Pure Veg', 'Paneer', 'Restaurant Style'],
    },
    prepTimeMins: 15,
    cookTimeMins: 20,
    servings: 3,
    difficulty: 'medium',
    ingredients: [
      { id: 'ing_pbm_1', name: 'Fresh Malai Paneer Cubes', quantity: 250, unit: 'g', groceryTerm: 'Fresh malai paneer' },
      { id: 'ing_pbm_2', name: 'Ripe Tomatoes', quantity: 4, unit: 'pcs', groceryTerm: 'Fresh tomatoes' },
      { id: 'ing_pbm_3', name: 'Cashew Nuts (Kaju)', quantity: 12, unit: 'pcs', groceryTerm: 'Cashews' },
      { id: 'ing_pbm_4', name: 'Butter', quantity: 30, unit: 'g', groceryTerm: 'Butter' },
      { id: 'ing_pbm_5', name: 'Fresh Cream', quantity: 2, unit: 'tbsp', groceryTerm: 'Amul fresh cream' },
      { id: 'ing_pbm_6', name: 'Ginger Garlic Paste', quantity: 1, unit: 'tbsp', groceryTerm: 'Ginger garlic paste' },
      { id: 'ing_pbm_7', name: 'Kashmiri Chili Powder & Garam Masala', quantity: 1.5, unit: 'tsp', groceryTerm: 'Kashmiri chili' },
      { id: 'ing_pbm_8', name: 'Kasuri Methi', quantity: 1, unit: 'tsp', groceryTerm: 'Kasuri methi' },
    ],
    steps: [
      { order: 1, text: 'Simmer chopped tomatoes and cashews in water for 8 minutes; cool and blend to a velvet smooth puree.' },
      { order: 2, text: 'Heat butter in a pan, sauté ginger garlic paste for 1 minute until fragrant.' },
      { order: 3, text: 'Add the tomato cashew paste, chili powder, garam masala, and salt. Cook until thick and glossy.' },
      { order: 4, text: 'Gently add soft paneer cubes. Simmer for 4-5 minutes on low heat.' },
      { order: 5, text: 'Stir in fresh cream, crushed kasuri methi, and a pinch of sugar. Serve with hot butter naan.' },
    ],
    rating: { value: 4.9, count: 590 },
    isAiGenerated: false,
  },
  {
    id: 'custom:mumbai-pav-bhaji',
    source: 'custom',
    externalId: 'mumbai-pav-bhaji',
    title: 'Mumbai Chowpatty Butter Pav Bhaji',
    description: 'Mashed medley of potatoes, peas, cauliflower, and capsicum cooked in spicy red tomato masala with loads of Amul butter.',
    image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80',
    cuisine: 'Street Food',
    category: 'dinner',
    dietary: {
      vegetarian: true,
      vegan: false,
      glutenFree: false,
      tags: ['Pure Veg', 'Street Food', 'Mumbai Favorite'],
    },
    prepTimeMins: 15,
    cookTimeMins: 20,
    servings: 3,
    difficulty: 'easy',
    ingredients: [
      { id: 'ing_pb_1', name: 'Boiled Potatoes & Green Peas', quantity: 300, unit: 'g', groceryTerm: 'Fresh potatoes' },
      { id: 'ing_pb_2', name: 'Pav Bread Buns', quantity: 6, unit: 'pcs', groceryTerm: 'Ladi pav buns' },
      { id: 'ing_pb_3', name: 'Finely Chopped Onion & Capsicum', quantity: 2, unit: 'pcs', groceryTerm: 'Onion capsicum' },
      { id: 'ing_pb_4', name: 'Tomatoes Pureed', quantity: 3, unit: 'pcs', groceryTerm: 'Tomatoes' },
      { id: 'ing_pb_5', name: 'Pav Bhaji Masala', quantity: 2, unit: 'tbsp', groceryTerm: 'Everest pav bhaji masala' },
      { id: 'ing_pb_6', name: 'Amul Butter', quantity: 50, unit: 'g', groceryTerm: 'Amul butter' },
      { id: 'ing_pb_7', name: 'Fresh Lemon & Coriander', quantity: 1, unit: 'pcs', groceryTerm: 'Fresh lemon' },
    ],
    steps: [
      { order: 1, text: 'Boil potatoes, cauliflower, and green peas until tender; mash thoroughly using a potato masher.' },
      { order: 2, text: 'Heat 2 tbsp butter on a flat tawa or pan, sauté chopped onions and capsicum for 4 minutes.' },
      { order: 3, text: 'Add tomato puree, ginger garlic paste, red chili powder, and pav bhaji masala. Cook until butter releases.' },
      { order: 4, text: 'Mix in the mashed vegetables with 1/2 cup water. Mash continuously on the tawa to achieve street-style texture.' },
      { order: 5, text: 'Toast pav buns on tawa with generous butter and a sprinkle of coriander.' },
      { order: 6, text: 'Serve piping hot bhaji with a dollop of butter, chopped onions, lemon wedges, and toasted pav.' },
    ],
    rating: { value: 4.9, count: 470 },
    isAiGenerated: false,
  },
  {
    id: 'custom:mysore-masala-dosa',
    source: 'custom',
    externalId: 'mysore-masala-dosa',
    title: 'Crispy Mysore Masala Dosa',
    description: 'Golden fermented rice-lentil crepe smeared with spicy garlic-red chili chutney, stuffed with spiced potato masala.',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
    cuisine: 'South Indian',
    category: 'breakfast',
    dietary: {
      vegetarian: true,
      vegan: true,
      glutenFree: true,
      tags: ['Pure Veg', 'South Indian', 'Breakfast', 'Gluten-Free'],
    },
    prepTimeMins: 10,
    cookTimeMins: 15,
    servings: 2,
    difficulty: 'medium',
    ingredients: [
      { id: 'ing_dosa_1', name: 'Fermented Dosa Batter', quantity: 400, unit: 'ml', groceryTerm: 'iD dosa batter' },
      { id: 'ing_dosa_2', name: 'Boiled Potatoes (mashed)', quantity: 3, unit: 'pcs', groceryTerm: 'Potatoes' },
      { id: 'ing_dosa_3', name: 'Onion & Green Chillies', quantity: 1, unit: 'pcs', groceryTerm: 'Onion' },
      { id: 'ing_dosa_4', name: 'Mustard Seeds & Curry Leaves', quantity: 1, unit: 'tsp', groceryTerm: 'Curry leaves' },
      { id: 'ing_dosa_5', name: 'Red Chili Garlic Chutney', quantity: 2, unit: 'tbsp', groceryTerm: 'Garlic chutney' },
      { id: 'ing_dosa_6', name: 'Ghee or Oil', quantity: 2, unit: 'tbsp', groceryTerm: 'Desi ghee' },
    ],
    steps: [
      { order: 1, text: 'Prepare potato masala: temper mustard seeds, curry leaves, and green chillies in oil; add onions, turmeric, and mashed potatoes.' },
      { order: 2, text: 'Heat a cast iron tawa until hot, sprinkle water, and wipe clean.' },
      { order: 3, text: 'Pour a ladle of batter and spread circularly into a thin crispy crepe.' },
      { order: 4, text: 'Drizzle ghee around the edges; spread a spoonful of red garlic chutney over the dosa surface.' },
      { order: 5, text: 'Place potato masala in the center. Once underside is golden brown and crisp, fold in half.' },
      { order: 6, text: 'Serve hot with coconut chutney and hot drumstick sambar.' },
    ],
    rating: { value: 4.9, count: 530 },
    isAiGenerated: false,
  },
];

export class CatalogRecipeProvider implements RecipeProvider {
  id = 'custom';
  capabilities = {
    ingredientSearch: true,
    cuisineFilter: true,
    nutrition: false,
  };
  attribution = {
    name: 'AajKyaBanaye Kitchen',
    url: '',
    requirements: 'Internal curated kitchen catalog',
  };

  async search(params: SearchParams): Promise<Paged<Recipe>> {
    const query = (params.query || '').trim().toLowerCase();
    const category = params.category?.toLowerCase();
    const cuisine = params.cuisine?.toLowerCase();
    const diet = params.diet;
    const maxTime = params.maxTime;
    const difficulty = params.difficulty;

    let filtered = POPULAR_INDIAN_CATALOG.filter((recipe) => {
      // 1. Text Query Filter
      if (query) {
        const titleMatch = recipe.title.toLowerCase().includes(query);
        const descMatch = (recipe.description || '').toLowerCase().includes(query);
        const ingMatch = recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(query));
        const tagMatch = recipe.dietary.tags.some((t) => t.toLowerCase().includes(query));
        const cuisineMatch = (recipe.cuisine || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !ingMatch && !tagMatch && !cuisineMatch) {
          return false;
        }
      }

      // 2. Category Filter
      if (category && category !== 'all' && recipe.category) {
        if (recipe.category.toLowerCase() !== category) return false;
      }

      // 3. Cuisine Filter
      if (cuisine && cuisine !== 'all') {
        if (!recipe.cuisine?.toLowerCase().includes(cuisine)) return false;
      }

      // 4. Diet Filter
      if (diet) {
        if (diet === 'veg' && !recipe.dietary.vegetarian) return false;
        if (diet === 'non-veg' && recipe.dietary.vegetarian) return false;
        if (diet === 'vegan' && !recipe.dietary.vegan) return false;
      }

      // 5. Max Time Filter
      if (maxTime && recipe.cookTimeMins) {
        const totalTime = (recipe.prepTimeMins || 0) + recipe.cookTimeMins;
        if (totalTime > maxTime) return false;
      }

      // 6. Difficulty Filter
      if (difficulty && (difficulty as string) !== 'all') {
        if (recipe.difficulty !== difficulty) return false;
      }

      return true;
    });

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 12);
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginated,
      total: filtered.length,
      page,
      limit,
      hasMore: startIndex + limit < filtered.length,
    };
  }

  async list(params: { page?: number; limit?: number; category?: string; cuisine?: string }): Promise<Paged<Recipe>> {
    return this.search(params);
  }

  async getById(externalId: string): Promise<Recipe | null> {
    const cleanId = externalId.replace(/^custom:/, '');
    const found = POPULAR_INDIAN_CATALOG.find(
      (r) => r.externalId === cleanId || r.id === `custom:${cleanId}` || r.id === externalId
    );
    return found || null;
  }
}
