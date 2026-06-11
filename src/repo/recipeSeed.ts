import type { RecipeSuggestion } from '../types/pantry';

/**
 * Mock recipe suggestions. In the real backend these come from a single
 * LLM call (Claude Haiku-class) seeded with the pantry's near-expiry
 * items, cached by pantry hash. Here they're hand-written but reference
 * the same pantry item ids from `pantrySeed.ts` so `markCooked` has
 * something real to decrement.
 *
 * `is_expiring_soon` flags drive the "ใช้ของใกล้หมดอายุ" highlight in the UI.
 */
export const RECIPE_SEED_SETS: RecipeSuggestion[][] = [
  // Set A — default suggestions, prioritizing หมูสับ / ผักบุ้ง / ต้นหอม (expiring today/tomorrow)
  [
    {
      id: 'r-pad-krapow',
      name_th: 'กะเพราหมูสับไข่ดาว',
      time_minutes: 15,
      description_th: 'ใช้หมูสับที่ใกล้หมดอายุ ทำง่าย ใช้เวลาไม่ถึง 15 นาที',
      ingredients: [
        { pantry_item_id: 'p-1', name_th: 'หมูสับ', is_expiring_soon: true },
        { pantry_item_id: 'p-2', name_th: 'ไข่ไก่', is_expiring_soon: false },
        { pantry_item_id: 'p-5', name_th: 'กระเทียม', is_expiring_soon: false },
        { pantry_item_id: 'p-6', name_th: 'น้ำปลา', is_expiring_soon: false },
      ],
      steps_th: [
        'ตั้งกระทะ ใส่น้ำมัน เจียวกระเทียมให้หอม',
        'ใส่หมูสับ ผัดให้สุก',
        'ปรุงรสด้วยน้ำปลา ซอสปรุงรส และน้ำตาลเล็กน้อย',
        'ใส่ใบกะเพรา ผัดให้เข้ากัน ตักขึ้นเสิร์ฟพร้อมข้าวสวย',
        'ทอดไข่ดาวราดด้านบน เสิร์ฟร้อนๆ',
      ],
    },
    {
      id: 'r-pad-morning-glory',
      name_th: 'ผัดผักบุ้งไฟแดง',
      time_minutes: 10,
      description_th: 'เคลียร์ผักบุ้งที่หมดอายุวันนี้ก่อนเสีย',
      ingredients: [
        { pantry_item_id: 'p-3', name_th: 'ผักบุ้ง', is_expiring_soon: true },
        { pantry_item_id: 'p-5', name_th: 'กระเทียม', is_expiring_soon: false },
        { pantry_item_id: 'p-6', name_th: 'น้ำปลา', is_expiring_soon: false },
      ],
      steps_th: [
        'ล้างผักบุ้งให้สะอาด หั่นท่อนพอดีคำ',
        'ตั้งกระทะไฟแรง ใส่น้ำมัน เจียวกระเทียม',
        'ใส่ผักบุ้ง ผัดเร็วๆ ด้วยไฟแรง',
        'ปรุงรสด้วยน้ำปลา ซีอิ๊วขาว และน้ำตาลเล็กน้อย ผัดให้เข้ากันแล้วตักเสิร์ฟทันที',
      ],
    },
    {
      id: 'r-tom-yum-chicken',
      name_th: 'ต้มยำอกไก่ใส่ต้นหอม',
      time_minutes: 25,
      description_th: 'ใช้ต้นหอมที่ใกล้หมดอายุ และอกไก่ในตู้',
      ingredients: [
        { pantry_item_id: 'p-7', name_th: 'อกไก่', is_expiring_soon: false },
        { pantry_item_id: 'p-9', name_th: 'ต้นหอม', is_expiring_soon: true },
        { pantry_item_id: 'p-12', name_th: 'มะนาว', is_expiring_soon: true },
      ],
      steps_th: [
        'ต้มน้ำซุปให้เดือด ใส่ข่า ตะไคร้ ใบมะกรูด',
        'ใส่อกไก่หั่นชิ้นพอดีคำ ต้มจนสุก',
        'ปรุงรสด้วยน้ำปลา พริก และมะนาว',
        'โรยต้นหอมซอย ตักเสิร์ฟร้อนๆ',
      ],
    },
  ],

  // Set B — alternate set (shown after "ขอเมนูใหม่")
  [
    {
      id: 'r-tomato-egg-soup',
      name_th: 'แกงจืดมะเขือเทศไข่',
      time_minutes: 15,
      description_th: 'เมนูเบาๆ ใช้มะเขือเทศก่อนเหี่ยว',
      ingredients: [
        { pantry_item_id: 'p-4', name_th: 'มะเขือเทศ', is_expiring_soon: false },
        { pantry_item_id: 'p-2', name_th: 'ไข่ไก่', is_expiring_soon: false },
        { pantry_item_id: 'p-5', name_th: 'กระเทียม', is_expiring_soon: false },
      ],
      steps_th: [
        'ต้มน้ำซุปกระดูกหมูหรือน้ำเปล่าให้เดือด ใส่กระเทียมทุบ',
        'ใส่มะเขือเทศหั่นชิ้น ต้มจนนุ่ม',
        'ตีไข่แล้วค่อยๆ เทลงในหม้อ คนเบาๆ ให้เป็นฝอย',
        'ปรุงรสด้วยซีอิ๊วขาวและพริกไทย เสิร์ฟร้อนๆ',
      ],
    },
    {
      id: 'r-fried-rice-pork',
      name_th: 'ข้าวผัดหมูสับ',
      time_minutes: 12,
      description_th: 'ใช้หมูสับและข้าวสารในตู้ ทำเร็ว อิ่มท้อง',
      ingredients: [
        { pantry_item_id: 'p-1', name_th: 'หมูสับ', is_expiring_soon: true },
        { pantry_item_id: 'p-8', name_th: 'ข้าวสาร', is_expiring_soon: false },
        { pantry_item_id: 'p-2', name_th: 'ไข่ไก่', is_expiring_soon: false },
      ],
      steps_th: [
        'ตั้งกระทะ ใส่น้ำมัน ผัดหมูสับให้สุก',
        'ใส่ไข่ลงไปคนให้ทั่ว',
        'ใส่ข้าวสวย ผัดให้เข้ากันจนร้อน',
        'ปรุงรสด้วยซอสปรุงรสและซีอิ๊วขาว ผัดให้เข้ากัน เสิร์ฟพร้อมแตงกวาและมะนาว',
      ],
    },
    {
      id: 'r-stir-fry-cabbage',
      name_th: 'กะหล่ำปลีผัดน้ำปลา',
      time_minutes: 10,
      description_th: 'เมนูง่ายๆ จากของที่มีอยู่แล้ว',
      ingredients: [
        { pantry_item_id: 'p-5', name_th: 'กระเทียม', is_expiring_soon: false },
        { pantry_item_id: 'p-6', name_th: 'น้ำปลา', is_expiring_soon: false },
        { pantry_item_id: 'p-7', name_th: 'อกไก่', is_expiring_soon: false },
      ],
      steps_th: [
        'หั่นกะหล่ำปลีเป็นชิ้นพอดีคำ และหั่นอกไก่เป็นชิ้นบาง',
        'ตั้งกระทะ เจียวกระเทียมให้หอม ใส่อกไก่ผัดให้สุก',
        'ใส่กะหล่ำปลี ผัดให้เริ่มนุ่ม',
        'ปรุงรสด้วยน้ำปลาและน้ำตาลเล็กน้อย ผัดให้เข้ากัน เสิร์ฟร้อนๆ',
      ],
    },
  ],
];
