import type { CatalogCategory } from '../types/pantry';

/**
 * Bridges the Supabase schema's free-text Thai `catalog_items.category`
 * column (see `supabase/seed.sql`) to the frontend's {@link CatalogCategory}
 * enum, and supplies an emoji icon. Icons are resolved per-ingredient by name
 * ({@link ICON_BY_NAME}) with a per-category fallback, since the DB has no
 * `icon` column.
 *
 * Unknown category strings fall back to `'other'` / 🧺 and unknown names fall
 * back to their category icon — a future catalog edit never breaks the UI.
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
  grain: '🌾',
  frozen: '🧊',
  other: '🧺',
};

/** Thai display label per (frontend) category — used for picker section headings. */
export const CATEGORY_LABEL_TH: Record<CatalogCategory, string> = {
  meat: 'เนื้อสัตว์',
  vegetable: 'ผัก',
  egg_dairy: 'นม-ไข่',
  condiment: 'เครื่องปรุง',
  grain: 'ของแห้ง',
  frozen: 'ของแช่แข็ง',
  fruit: 'ผลไม้',
  seafood: 'อาหารทะเล',
  other: 'อื่นๆ',
};

/** Display order of categories in the "เพิ่มของ" picker. */
export const CATEGORY_ORDER: CatalogCategory[] = [
  'meat',
  'vegetable',
  'egg_dairy',
  'condiment',
  'grain',
  'frozen',
  'fruit',
  'seafood',
  'other',
];

/**
 * Per-ingredient emoji, keyed by exact `name_th`. Covers the seeded Thai
 * staples (supabase/seed.sql). Anything not listed falls back to its category
 * icon via {@link iconForName}.
 */
const ICON_BY_NAME: Record<string, string> = {
  // เนื้อสัตว์
  หมูสับ: '🥩', หมูบดติดมัน: '🥩', สันคอหมู: '🥩', หมูสามชั้น: '🥓',
  เนื้อวัว: '🥩', เนื้อบดวัว: '🥩', อกไก่: '🍗', สะโพกไก่: '🍗',
  ปีกไก่: '🍗', ไก่สับ: '🍗', กุ้งสด: '🦐', ปลาดุก: '🐟', ปลาทู: '🐟',
  ปลาแซลมอน: '🐟', ปลาหมึก: '🦑', ลูกชิ้นปลา: '🍢', ลูกชิ้นหมู: '🍢',
  หมูยอ: '🍥', แหนม: '🌭', ไส้กรอกหมู: '🌭',
  // ผัก
  กระเทียม: '🧄', หอมแดง: '🧅', หอมหัวใหญ่: '🧅', ต้นหอม: '🌿',
  ผักชี: '🌿', กะเพรา: '🌿', โหระพา: '🌿', สะระแหน่: '🌿', ตะไคร้: '🌿',
  ใบมะกรูด: '🌿', ขิง: '🫚', ข่า: '🫚', ผักบุ้ง: '🥬', คะน้า: '🥬',
  กะหล่ำปลี: '🥬', ผักกาดขาว: '🥬', 'บร็อคโคลี่': '🥦', แครอท: '🥕',
  แตงกวา: '🥒', บวบ: '🥒', มะเขือเทศ: '🍅', มะนาว: '🍋', มะเขือยาว: '🍆',
  มะเขือเปราะ: '🍆', ฟักทอง: '🎃', ข้าวโพด: '🌽', มันฝรั่ง: '🥔',
  'พริกชี้ฟ้า': '🌶️', ถั่วงอก: '🌱', ถั่วฝักยาว: '🫛', เห็ดนางฟ้า: '🍄',
  เห็ดฟาง: '🍄',
  // ของแห้ง
  ข้าวสาร: '🍚', ข้าวเหนียว: '🍚', 'ข้าวโอ๊ต': '🥣', แป้งสาลี: '🌾',
  แป้งข้าวเจ้า: '🌾', แป้งทอดกรอบ: '🌾', 'บะหมี่กึ่งสำเร็จรูป': '🍜',
  'เส้นก๋วยเตี๋ยว': '🍜', 'เส้นหมี่': '🍜', 'วุ้นเส้น': '🍜',
  ถั่วลิสง: '🥜', 'ถั่วเขียว': '🫘', งาขาว: '🌰', แห้ง: '🌶️',
  พริกแห้ง: '🌶️', เห็ดหอมแห้ง: '🍄', แห้งสาหร่าย: '🍙', สาหร่ายแห้ง: '🍙',
  'กุ้งแห้ง': '🦐',
  // นม-ไข่
  ไข่ไก่: '🥚', ไข่เป็ด: '🥚', นมสด: '🥛', นมจืด: '🥛', นมข้นจืด: '🥛',
  นมข้นหวาน: '🥛', ชีส: '🧀', เนย: '🧈', 'โยเกิร์ต': '🥛', 'วิปปิ้งครีม': '🍦',
  // เครื่องปรุง
  'น้ำปลา': '🐟', 'ซีอิ๊วขาว': '🍶', 'ซีอิ๊วดำ': '🍶', 'น้ำส้มสายชู': '🍶',
  ซอสหอยนางรม: '🦪', 'น้ำมันหอย': '🦪', 'น้ำมันหอยเจ': '🌱', ซอสพริก: '🌶️',
  ซอสมะเขือเทศ: '🍅', 'น้ำมันพืช': '🫗', เกลือ: '🧂', 'น้ำตาลทราย': '🧂',
  'น้ำตาลปี๊บ': '🍯', พริกไทย: '🧂', ผงชูรส: '🧂', ผงปรุงรส: '🧂',
  ผงกะหรี่: '🍛', ซุปก้อน: '🍲', กะปิ: '🦐', พริกแกงเขียวหวาน: '🌶️',
  พริกแกงเผ็ด: '🌶️', พริกแกงแดง: '🌶️', แป้งชุบทอด: '🌾',
  // ของแช่แข็ง
  'กุ้งแช่แข็ง': '🦐', 'ปลาแซลมอนแช่แข็ง': '🐟', 'นักเก็ตไก่': '🍗',
  'ไส้กรอกแช่แข็ง': '🌭', 'ลูกชิ้นแช่แข็ง': '🍢', 'เกี๊ยวซ่าแช่แข็ง': '🥟',
  'แป้งเกี๊ยวแช่แข็ง': '🥟', 'ข้าวสวยแช่แข็ง': '🍚', 'ผักรวมแช่แข็ง': '🥗',
  'มันฝรั่งทอดแช่แข็ง': '🍟',
  // extras present in the mock catalog seed (src/repo/catalogSeed.ts)
  กล้วย: '🍌', 'แอปเปิ้ล': '🍎', 'กุ้ง': '🦐', 'เต้าหู้ไข่': '🍮',
  'บะหมี่': '🍜', 'เกี๊ยวซ่า': '🥟', หอมใหญ่: '🧅', ผักกาดหอม: '🥬',
  'พริกขี้หนู': '🌶️',
};

/** Map a raw `catalog_items.category` DB value to the frontend enum. */
export function mapDbCategory(dbCategory: string): CatalogCategory {
  return CATEGORY_BY_DB_VALUE[dbCategory] ?? 'other';
}

/** Quick-pick emoji icon for a (frontend) category. */
export function iconForCategory(category: CatalogCategory): string {
  return ICON_BY_CATEGORY[category];
}

/** Per-ingredient emoji by name, falling back to the category icon. */
export function iconForName(nameTh: string, category: CatalogCategory): string {
  return ICON_BY_NAME[nameTh] ?? iconForCategory(category);
}

/** Default icon + category used for free-text pantry entries. */
export const FREE_TEXT_CATEGORY: CatalogCategory = 'other';
export const FREE_TEXT_ICON = '🧺';
