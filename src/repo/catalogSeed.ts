import type { CatalogItem } from '../types/pantry';
import { iconForName } from '../lib/categoryMap';

/**
 * Curated Thai-staples quick-pick catalog (~30 items).
 * `default_shelf_life_days` is a rough household estimate — good enough
 * to remove manual date entry for the common case (CLAUDE.md rule #1).
 *
 * Icons below are placeholders; the exported {@link CATALOG_SEED} overrides
 * each one via `iconForName` so mock and the real Supabase repo resolve icons
 * through the exact same per-ingredient map.
 */
const CATALOG_SEED_RAW: CatalogItem[] = [
  // Vegetables
  { id: 'cat-egg', name_th: 'ไข่ไก่', category: 'egg_dairy', default_shelf_life_days: 21, icon: '🥚', is_seed: true },
  { id: 'cat-cabbage', name_th: 'กะหล่ำปลี', category: 'vegetable', default_shelf_life_days: 10, icon: '🥬', is_seed: true },
  { id: 'cat-morning-glory', name_th: 'ผักบุ้ง', category: 'vegetable', default_shelf_life_days: 3, icon: '🥬', is_seed: true },
  { id: 'cat-tomato', name_th: 'มะเขือเทศ', category: 'vegetable', default_shelf_life_days: 7, icon: '🍅', is_seed: true },
  { id: 'cat-cucumber', name_th: 'แตงกวา', category: 'vegetable', default_shelf_life_days: 7, icon: '🥒', is_seed: true },
  { id: 'cat-carrot', name_th: 'แครอท', category: 'vegetable', default_shelf_life_days: 14, icon: '🥕', is_seed: true },
  { id: 'cat-onion', name_th: 'หอมใหญ่', category: 'vegetable', default_shelf_life_days: 30, icon: '🧅', is_seed: true },
  { id: 'cat-garlic', name_th: 'กระเทียม', category: 'vegetable', default_shelf_life_days: 30, icon: '🧄', is_seed: true },
  { id: 'cat-chili', name_th: 'พริกขี้หนู', category: 'vegetable', default_shelf_life_days: 7, icon: '🌶️', is_seed: true },
  { id: 'cat-lime', name_th: 'มะนาว', category: 'fruit', default_shelf_life_days: 14, icon: '🍋', is_seed: true },
  { id: 'cat-lettuce', name_th: 'ผักกาดหอม', category: 'vegetable', default_shelf_life_days: 5, icon: '🥬', is_seed: true },
  { id: 'cat-bean-sprout', name_th: 'ถั่วงอก', category: 'vegetable', default_shelf_life_days: 2, icon: '🌱', is_seed: true },
  { id: 'cat-spring-onion', name_th: 'ต้นหอม', category: 'vegetable', default_shelf_life_days: 5, icon: '🌿', is_seed: true },
  { id: 'cat-coriander', name_th: 'ผักชี', category: 'vegetable', default_shelf_life_days: 4, icon: '🌿', is_seed: true },

  // Fruit
  { id: 'cat-banana', name_th: 'กล้วย', category: 'fruit', default_shelf_life_days: 5, icon: '🍌', is_seed: true },
  { id: 'cat-apple', name_th: 'แอปเปิ้ล', category: 'fruit', default_shelf_life_days: 21, icon: '🍎', is_seed: true },

  // Meat & seafood
  { id: 'cat-chicken', name_th: 'อกไก่', category: 'meat', default_shelf_life_days: 3, icon: '🍗', is_seed: true },
  { id: 'cat-pork', name_th: 'หมูสับ', category: 'meat', default_shelf_life_days: 2, icon: '🥩', is_seed: true },
  { id: 'cat-pork-belly', name_th: 'หมูสามชั้น', category: 'meat', default_shelf_life_days: 3, icon: '🥓', is_seed: true },
  { id: 'cat-egg-tofu', name_th: 'เต้าหู้ไข่', category: 'egg_dairy', default_shelf_life_days: 7, icon: '🧈', is_seed: true },
  { id: 'cat-shrimp', name_th: 'กุ้ง', category: 'seafood', default_shelf_life_days: 2, icon: '🦐', is_seed: true },
  { id: 'cat-fish', name_th: 'ปลาทู', category: 'seafood', default_shelf_life_days: 2, icon: '🐟', is_seed: true },
  { id: 'cat-fish-ball', name_th: 'ลูกชิ้นปลา', category: 'frozen', default_shelf_life_days: 14, icon: '🍢', is_seed: true },

  // Egg / dairy
  { id: 'cat-milk', name_th: 'นมสด', category: 'egg_dairy', default_shelf_life_days: 7, icon: '🥛', is_seed: true },
  { id: 'cat-yogurt', name_th: 'โยเกิร์ต', category: 'egg_dairy', default_shelf_life_days: 10, icon: '🥣', is_seed: true },

  // Condiments
  { id: 'cat-fish-sauce', name_th: 'น้ำปลา', category: 'condiment', default_shelf_life_days: 365, icon: '🍶', is_seed: true },
  { id: 'cat-soy-sauce', name_th: 'ซีอิ๊วขาว', category: 'condiment', default_shelf_life_days: 365, icon: '🍶', is_seed: true },
  { id: 'cat-oyster-sauce', name_th: 'ซอสหอยนางรม', category: 'condiment', default_shelf_life_days: 365, icon: '🍶', is_seed: true },

  // Grains
  { id: 'cat-rice', name_th: 'ข้าวสาร', category: 'grain', default_shelf_life_days: 180, icon: '🍚', is_seed: true },
  { id: 'cat-noodle', name_th: 'บะหมี่', category: 'grain', default_shelf_life_days: 180, icon: '🍜', is_seed: true },

  // Frozen
  { id: 'cat-dumpling', name_th: 'เกี๊ยวซ่า', category: 'frozen', default_shelf_life_days: 60, icon: '🥟', is_seed: true },
];

export const CATALOG_SEED: CatalogItem[] = CATALOG_SEED_RAW.map((item) => ({
  ...item,
  icon: iconForName(item.name_th, item.category),
}));
