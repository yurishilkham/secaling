export type CategoryKey =
  | 'maling'
  | 'kebakaran'
  | 'kecelakaan'
  | 'bencana'
  | 'kehilangan'
  | 'lainnya';

export interface Category {
  key: CategoryKey;
  label: string;
  color: string;
  soft: string;
  icon: keyof typeof import('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
}

export const CATEGORIES: Record<CategoryKey, Category> = {
  maling: { key: 'maling', label: 'Maling', color: '#DC2626', soft: '#FEE2E2', icon: 'warning' },
  kebakaran: { key: 'kebakaran', label: 'Kebakaran', color: '#EA580C', soft: '#FFEDD5', icon: 'flame' },
  kecelakaan: { key: 'kecelakaan', label: 'Kecelakaan', color: '#D97706', soft: '#FEF3C7', icon: 'car-sport' },
  bencana: { key: 'bencana', label: 'Bencana Alam', color: '#0EA5E9', soft: '#E0F2FE', icon: 'rainy' },
  kehilangan: { key: 'kehilangan', label: 'Kehilangan', color: '#7C3AED', soft: '#EDE9FE', icon: 'help-circle' },
  lainnya: { key: 'lainnya', label: 'Lainnya', color: '#6B7280', soft: '#F3F4F6', icon: 'notifications' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];