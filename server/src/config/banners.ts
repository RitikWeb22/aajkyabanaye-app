export interface BannerConfig {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  image?: string;
  action: {
    type: 'category' | 'recipe' | 'search' | 'url';
    value: string;
  };
  buttonText?: string;
  priority: number;
  isActive: boolean;
  activeFrom?: string;
  activeTo?: string;
}

export const DEFAULT_BANNERS: BannerConfig[] = [
  {
    id: 'banner_what_to_cook',
    title: 'Aaj Kya Banega?',
    subtitle: 'Find instant delicious recipes from whatever ingredients you have in your kitchen!',
    badgeText: 'FEATURE OF THE DAY',
    buttonText: 'Cook With Ingredients',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    action: {
      type: 'search',
      value: 'ingredients',
    },
    priority: 1,
    isActive: true,
  },
  {
    id: 'banner_quick_dinners',
    title: 'Dinner Under 30 Mins',
    subtitle: 'Quick, nourishing & comforting meals tailored for busy evenings.',
    badgeText: 'QUICK & EASY',
    buttonText: 'Explore Dinners',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
    action: {
      type: 'category',
      value: 'dinner',
    },
    priority: 2,
    isActive: true,
  },
  {
    id: 'banner_desi_comfort',
    title: 'Authentic Indian Curries',
    subtitle: 'Rich masalas, fragrant gravies and classic homestyle favorites.',
    badgeText: 'HOMESTYLE DESI',
    buttonText: 'View Curries',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80',
    action: {
      type: 'search',
      value: 'curry',
    },
    priority: 3,
    isActive: true,
  },
];
