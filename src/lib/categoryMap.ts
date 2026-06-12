import type { CatalogCategory } from '../types/pantry';

/**
 * Bridges the Supabase schema's free-text Thai `catalog_items.category`
 * column (see `supabase/seed.sql`, e.g. "เนื้อสัตว์", "ผัก") to the
 * frontend's {@link CatalogCategory} enum, and supplies a quick-pick emoji
 * icon per category (the DB has no `icon` column).
 *
 * Unknown/unrecognized category strings fall back to `'other'` / 🧺 rather
 * than throwing, so a future catalog edit never breaks the UI.
 */
const CATEGORY_BY_DB_VALUE: Record<string, CatalogCategory> = {
  เนื้อสัตว์: 'meat',
  ผัก: 'vegetable',
  ผลไม้: 'fruit',
  'ของแห้ง': 'grain',
  เครื่องปรุง: 'condiment',
  'นม-ไข่': 'egg_dairy',
  'ของแช่แข็ง': 'frozen',
};

const ICON_BY_CATEGORY: Record<CatalogCategory, string> = {
  vegetable: '🥬',
  fruit: '🍎',
  meat: '🍖',
  seafood: '🐟',
  egg_dairy: '🥚',
  condiment: '🍶',
  grain: '🍚',
  frozen: '🧊',
  other: '🧺',
};

/** Map a raw `catalog_items.category` DB value to the frontend enum. */
export function mapDbCategory(dbCategory: string): CatalogCategory {
  return CATEGORY_BY_DB_VALUE[dbCategory] ?? 'other';
}

/** Quick-pick emoji icon for a (frontend) category. */
export function iconForCategory(category: CatalogCategory): string {
  return ICON_BY_CATEGORY[category];
}

/** Default icon + category used for free-text pantry entries. */
export const FREE_TEXT_CATEGORY: CatalogCategory = 'other';
export const FREE_TEXT_ICON = '🧺';
