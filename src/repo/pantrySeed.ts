import { addDaysIso, todayIso } from '../lib/date';
import type { PantryItem } from '../types/pantry';

/**
 * Seed pantry data (~12 items) with varied expiry dates, including a
 * couple expiring today/tomorrow so the "เมนูคืนนี้" warning strip and
 * suggestion logic have something to react to on first load.
 *
 * `created_at`/`updated_at` are stamped at module-eval time which is
 * fine for a mock store reset on page reload.
 */
export function buildPantrySeed(): PantryItem[] {
  const now = new Date().toISOString();
  const HOUSEHOLD_ID = 'mock-household';

  const items: Omit<PantryItem, 'created_at' | 'updated_at'>[] = [
    {
      id: 'p-1',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-pork',
      free_text_name: null,
      name_th: 'หมูสับ',
      category: 'meat',
      icon: '🥩',
      qty_state: 'full',
      expiry_date: addDaysIso(1), // expiring tomorrow
      status: 'active',
    },
    {
      id: 'p-2',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-egg',
      free_text_name: null,
      name_th: 'ไข่ไก่',
      category: 'egg_dairy',
      icon: '🥚',
      qty_state: 'half',
      expiry_date: addDaysIso(12),
      status: 'active',
    },
    {
      id: 'p-3',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-morning-glory',
      free_text_name: null,
      name_th: 'ผักบุ้ง',
      category: 'vegetable',
      icon: '🥬',
      qty_state: 'full',
      expiry_date: addDaysIso(0), // expiring today
      status: 'active',
    },
    {
      id: 'p-4',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-tomato',
      free_text_name: null,
      name_th: 'มะเขือเทศ',
      category: 'vegetable',
      icon: '🍅',
      qty_state: 'full',
      expiry_date: addDaysIso(4),
      status: 'active',
    },
    {
      id: 'p-5',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-garlic',
      free_text_name: null,
      name_th: 'กระเทียม',
      category: 'vegetable',
      icon: '🧄',
      qty_state: 'half',
      expiry_date: addDaysIso(20),
      status: 'active',
    },
    {
      id: 'p-6',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-fish-sauce',
      free_text_name: null,
      name_th: 'น้ำปลา',
      category: 'condiment',
      icon: '🍶',
      qty_state: 'full',
      expiry_date: addDaysIso(300),
      status: 'active',
    },
    {
      id: 'p-7',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-chicken',
      free_text_name: null,
      name_th: 'อกไก่',
      category: 'meat',
      icon: '🍗',
      qty_state: 'full',
      expiry_date: addDaysIso(2),
      status: 'active',
    },
    {
      id: 'p-8',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-rice',
      free_text_name: null,
      name_th: 'ข้าวสาร',
      category: 'grain',
      icon: '🍚',
      qty_state: 'half',
      expiry_date: addDaysIso(150),
      status: 'active',
    },
    {
      id: 'p-9',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-spring-onion',
      free_text_name: null,
      name_th: 'ต้นหอม',
      category: 'vegetable',
      icon: '🌿',
      qty_state: 'half',
      expiry_date: addDaysIso(1), // expiring tomorrow
      status: 'active',
    },
    {
      id: 'p-10',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-milk',
      free_text_name: null,
      name_th: 'นมสด',
      category: 'egg_dairy',
      icon: '🥛',
      qty_state: 'half',
      expiry_date: addDaysIso(3),
      status: 'active',
    },
    {
      id: 'p-11',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: null,
      free_text_name: 'น้ำพริกเผาโฮมเมด',
      name_th: 'น้ำพริกเผาโฮมเมด',
      category: 'condiment',
      icon: '🥄',
      qty_state: 'half',
      expiry_date: addDaysIso(10),
      status: 'active',
    },
    {
      id: 'p-12',
      household_id: HOUSEHOLD_ID,
      catalog_item_id: 'cat-lime',
      free_text_name: null,
      name_th: 'มะนาว',
      category: 'fruit',
      icon: '🍋',
      qty_state: 'full',
      expiry_date: addDaysIso(-1), // already expired (yesterday)
      status: 'active',
    },
  ];

  return items.map((item) => ({ ...item, created_at: now, updated_at: now }));
}

/** Convenience export of "today" used by seed comments / tests. */
export const SEED_TODAY = todayIso();
