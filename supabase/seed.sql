-- Kitchen Buddy: seed data
--
-- ~100 Thai pantry staples for the quick-pick ingredient grid (CLAUDE.md
-- product rule #4). default_shelf_life_days is a rough "how many days from
-- today does this typically last once it's in your fridge/pantry" — used to
-- auto-fill pantry_items.expiry_date so the user never types a date.
--
-- This file is idempotent: re-running `supabase db reset` (which calls this
-- seed) will not duplicate rows, because we delete previously-seeded rows
-- first (is_seed = true) and re-insert.

delete from public.catalog_items where is_seed = true;

insert into public.catalog_items (name_th, name_en, category, default_shelf_life_days, is_seed) values
  -- เนื้อสัตว์ (meat / seafood)
  ('หมูสับ', 'Ground pork', 'เนื้อสัตว์', 2, true),
  ('หมูสามชั้น', 'Pork belly', 'เนื้อสัตว์', 3, true),
  ('หมูบดติดมัน', 'Fatty ground pork', 'เนื้อสัตว์', 2, true),
  ('สันคอหมู', 'Pork shoulder', 'เนื้อสัตว์', 3, true),
  ('ไก่สับ', 'Ground chicken', 'เนื้อสัตว์', 2, true),
  ('อกไก่', 'Chicken breast', 'เนื้อสัตว์', 3, true),
  ('สะโพกไก่', 'Chicken thigh', 'เนื้อสัตว์', 3, true),
  ('ปีกไก่', 'Chicken wings', 'เนื้อสัตว์', 3, true),
  ('เนื้อวัว', 'Beef', 'เนื้อสัตว์', 3, true),
  ('เนื้อบดวัว', 'Ground beef', 'เนื้อสัตว์', 2, true),
  ('ปลาทู', 'Mackerel', 'เนื้อสัตว์', 2, true),
  ('ปลาแซลมอน', 'Salmon', 'เนื้อสัตว์', 2, true),
  ('ปลาดุก', 'Catfish', 'เนื้อสัตว์', 2, true),
  ('กุ้งสด', 'Fresh shrimp', 'เนื้อสัตว์', 2, true),
  ('ปลาหมึก', 'Squid', 'เนื้อสัตว์', 2, true),
  ('ลูกชิ้นหมู', 'Pork meatballs', 'เนื้อสัตว์', 7, true),
  ('ลูกชิ้นปลา', 'Fish balls', 'เนื้อสัตว์', 7, true),
  ('ไส้กรอกหมู', 'Pork sausage', 'เนื้อสัตว์', 7, true),
  ('แหนม', 'Naem (fermented pork)', 'เนื้อสัตว์', 5, true),
  ('หมูยอ', 'Moo yor', 'เนื้อสัตว์', 5, true),

  -- ผัก (vegetables)
  ('ผักบุ้ง', 'Water spinach', 'ผัก', 3, true),
  ('คะน้า', 'Chinese kale', 'ผัก', 4, true),
  ('กะหล่ำปลี', 'Cabbage', 'ผัก', 10, true),
  ('ผักกาดขาว', 'Napa cabbage', 'ผัก', 7, true),
  ('แครอท', 'Carrot', 'ผัก', 14, true),
  ('มะเขือเทศ', 'Tomato', 'ผัก', 5, true),
  ('แตงกวา', 'Cucumber', 'ผัก', 5, true),
  ('ต้นหอม', 'Spring onion', 'ผัก', 5, true),
  ('ผักชี', 'Coriander', 'ผัก', 4, true),
  ('กระเทียม', 'Garlic', 'ผัก', 30, true),
  ('หอมแดง', 'Shallot', 'ผัก', 30, true),
  ('หอมหัวใหญ่', 'Onion', 'ผัก', 21, true),
  ('พริกขี้หนู', 'Bird''s eye chili', 'ผัก', 7, true),
  ('พริกชี้ฟ้า', 'Spur chili', 'ผัก', 7, true),
  ('ขิง', 'Ginger', 'ผัก', 14, true),
  ('ข่า', 'Galangal', 'ผัก', 14, true),
  ('ตะไคร้', 'Lemongrass', 'ผัก', 10, true),
  ('ใบมะกรูด', 'Kaffir lime leaves', 'ผัก', 10, true),
  ('มะนาว', 'Lime', 'ผัก', 10, true),
  ('มะเขือเปราะ', 'Thai eggplant', 'ผัก', 5, true),
  ('มะเขือยาว', 'Long eggplant', 'ผัก', 5, true),
  ('ฟักทอง', 'Pumpkin', 'ผัก', 14, true),
  ('บวบ', 'Luffa gourd', 'ผัก', 4, true),
  ('ถั่วฝักยาว', 'Yardlong bean', 'ผัก', 4, true),
  ('ถั่วงอก', 'Bean sprouts', 'ผัก', 2, true),
  ('โหระพา', 'Thai basil', 'ผัก', 4, true),
  ('กะเพรา', 'Holy basil', 'ผัก', 4, true),
  ('สะระแหน่', 'Mint', 'ผัก', 4, true),
  ('บร็อคโคลี่', 'Broccoli', 'ผัก', 5, true),
  ('เห็ดฟาง', 'Straw mushroom', 'ผัก', 3, true),
  ('เห็ดนางฟ้า', 'Oyster mushroom', 'ผัก', 4, true),
  ('ข้าวโพด', 'Corn', 'ผัก', 5, true),
  ('มันฝรั่ง', 'Potato', 'ผัก', 21, true),

  -- ของแห้ง (dry goods)
  ('ข้าวสาร', 'Jasmine rice', 'ของแห้ง', 365, true),
  ('ข้าวเหนียว', 'Sticky rice', 'ของแห้ง', 365, true),
  ('เส้นก๋วยเตี๋ยว', 'Rice noodles (dry)', 'ของแห้ง', 180, true),
  ('เส้นหมี่', 'Rice vermicelli', 'ของแห้ง', 180, true),
  ('บะหมี่กึ่งสำเร็จรูป', 'Instant noodles', 'ของแห้ง', 180, true),
  ('วุ้นเส้น', 'Glass noodles', 'ของแห้ง', 365, true),
  ('แป้งสาลี', 'Wheat flour', 'ของแห้ง', 180, true),
  ('แป้งข้าวเจ้า', 'Rice flour', 'ของแห้ง', 180, true),
  ('แป้งทอดกรอบ', 'Crispy fry flour', 'ของแห้ง', 180, true),
  ('ถั่วลิสง', 'Peanuts', 'ของแห้ง', 90, true),
  ('งาขาว', 'White sesame seeds', 'ของแห้ง', 180, true),
  ('กุ้งแห้ง', 'Dried shrimp', 'ของแห้ง', 90, true),
  ('พริกแห้ง', 'Dried chili', 'ของแห้ง', 180, true),
  ('สาหร่ายแห้ง', 'Dried seaweed', 'ของแห้ง', 180, true),
  ('เห็ดหอมแห้ง', 'Dried shiitake mushroom', 'ของแห้ง', 180, true),
  ('ถั่วเขียว', 'Mung beans', 'ของแห้ง', 180, true),
  ('ข้าวโอ๊ต', 'Oats', 'ของแห้ง', 180, true),

  -- เครื่องปรุง (seasonings / condiments)
  ('ซีอิ๊วขาว', 'Light soy sauce', 'เครื่องปรุง', 365, true),
  ('ซีอิ๊วดำ', 'Dark soy sauce', 'เครื่องปรุง', 365, true),
  ('ซอสหอยนางรม', 'Oyster sauce', 'เครื่องปรุง', 365, true),
  ('น้ำปลา', 'Fish sauce', 'เครื่องปรุง', 365, true),
  ('น้ำมันหอย', 'Oyster sauce (alt)', 'เครื่องปรุง', 365, true),
  ('น้ำตาลทราย', 'White sugar', 'เครื่องปรุง', 365, true),
  ('น้ำตาลปี๊บ', 'Palm sugar', 'เครื่องปรุง', 180, true),
  ('เกลือ', 'Salt', 'เครื่องปรุง', 365, true),
  ('พริกไทย', 'Pepper', 'เครื่องปรุง', 365, true),
  ('ผงชูรส', 'MSG', 'เครื่องปรุง', 365, true),
  ('ผงปรุงรส', 'Seasoning powder', 'เครื่องปรุง', 365, true),
  ('น้ำมันพืช', 'Vegetable oil', 'เครื่องปรุง', 180, true),
  ('น้ำมันหอยเจ', 'Vegetarian oyster sauce', 'เครื่องปรุง', 365, true),
  ('น้ำส้มสายชู', 'Vinegar', 'เครื่องปรุง', 365, true),
  ('ซอสพริก', 'Chili sauce', 'เครื่องปรุง', 180, true),
  ('ซอสมะเขือเทศ', 'Ketchup', 'เครื่องปรุง', 180, true),
  ('พริกแกงเขียวหวาน', 'Green curry paste', 'เครื่องปรุง', 90, true),
  ('พริกแกงแดง', 'Red curry paste', 'เครื่องปรุง', 90, true),
  ('พริกแกงเผ็ด', 'Spicy curry paste', 'เครื่องปรุง', 90, true),
  ('กะปิ', 'Shrimp paste', 'เครื่องปรุง', 365, true),
  ('ผงกะหรี่', 'Curry powder', 'เครื่องปรุง', 365, true),
  ('ซุปก้อน', 'Stock cube', 'เครื่องปรุง', 365, true),
  ('แป้งชุบทอด', 'Tempura batter mix', 'เครื่องปรุง', 180, true),

  -- นม-ไข่ (dairy / eggs)
  ('ไข่ไก่', 'Chicken eggs', 'นม-ไข่', 21, true),
  ('ไข่เป็ด', 'Duck eggs', 'นม-ไข่', 21, true),
  ('นมสด', 'Fresh milk', 'นม-ไข่', 7, true),
  ('นมจืด', 'UHT milk (unsweetened)', 'นม-ไข่', 90, true),
  ('นมข้นหวาน', 'Sweetened condensed milk', 'นม-ไข่', 180, true),
  ('นมข้นจืด', 'Evaporated milk', 'นม-ไข่', 180, true),
  ('เนย', 'Butter', 'นม-ไข่', 60, true),
  ('ชีส', 'Cheese', 'นม-ไข่', 30, true),
  ('โยเกิร์ต', 'Yogurt', 'นม-ไข่', 14, true),
  ('วิปปิ้งครีม', 'Whipping cream', 'นม-ไข่', 14, true),

  -- ของแช่แข็ง (frozen)
  ('ผักรวมแช่แข็ง', 'Frozen mixed vegetables', 'ของแช่แข็ง', 180, true),
  ('นักเก็ตไก่', 'Chicken nuggets', 'ของแช่แข็ง', 180, true),
  ('ไส้กรอกแช่แข็ง', 'Frozen sausage', 'ของแช่แข็ง', 180, true),
  ('กุ้งแช่แข็ง', 'Frozen shrimp', 'ของแช่แข็ง', 90, true),
  ('ลูกชิ้นแช่แข็ง', 'Frozen meatballs', 'ของแช่แข็ง', 180, true),
  ('เกี๊ยวซ่าแช่แข็ง', 'Frozen gyoza', 'ของแช่แข็ง', 180, true),
  ('มันฝรั่งทอดแช่แข็ง', 'Frozen french fries', 'ของแช่แข็ง', 180, true),
  ('ข้าวสวยแช่แข็ง', 'Frozen cooked rice', 'ของแช่แข็ง', 60, true),
  ('แป้งเกี๊ยวแช่แข็ง', 'Frozen wonton wrappers', 'ของแช่แข็ง', 90, true),
  ('ปลาแซลมอนแช่แข็ง', 'Frozen salmon', 'ของแช่แข็ง', 90, true)
;
