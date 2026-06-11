/**
 * Core domain types for Kitchen Buddy.
 *
 * These mirror the eventual Supabase schema (see CLAUDE.md "Data model")
 * but are trimmed to what the frontend needs. Keep field names aligned
 * with the DB columns (snake_case) so swapping MockPantryRepo for a
 * SupabasePantryRepo later is a drop-in change.
 */

/** Coarse quantity states. Never grams or precise counts. */
export type QtyState = 'full' | 'half' | 'out';

/** Lifecycle status of a pantry item. */
export type PantryItemStatus = 'active' | 'consumed' | 'expired' | 'discarded';

/** Broad grouping used for icons / quick-pick grid sections. */
export type CatalogCategory =
  | 'vegetable'
  | 'fruit'
  | 'meat'
  | 'seafood'
  | 'egg_dairy'
  | 'condiment'
  | 'grain'
  | 'frozen'
  | 'other';

/**
 * A curated catalog item used for the quick-pick "เพิ่มของ" grid.
 * `default_shelf_life_days` drives the auto-computed expiry date so the
 * user never has to think about it (rule #1: <10s per item).
 */
export interface CatalogItem {
  id: string;
  name_th: string;
  category: CatalogCategory;
  default_shelf_life_days: number;
  /** Emoji shown on the quick-pick chip — cheap, no asset pipeline needed. */
  icon: string;
  is_seed: boolean;
}

/**
 * An item currently tracked in the household pantry.
 * Either `catalog_item_id` is set (came from quick-pick) or
 * `free_text_name` is set (manual entry) — never both.
 */
export interface PantryItem {
  id: string;
  household_id: string;
  catalog_item_id: string | null;
  free_text_name: string | null;
  /** Display name resolved from catalog or free text — convenience field for the UI. */
  name_th: string;
  category: CatalogCategory;
  icon: string;
  qty_state: QtyState;
  expiry_date: string; // ISO date (YYYY-MM-DD)
  status: PantryItemStatus;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/** A single ingredient line referenced by a recipe suggestion. */
export interface RecipeIngredient {
  /** Matches PantryItem.id when the ingredient is currently in the pantry. */
  pantry_item_id: string;
  name_th: string;
  /** True if this ingredient is near-expiry and the reason this recipe was suggested. */
  is_expiring_soon: boolean;
}

/**
 * AI (or mock) recipe suggestion for "เมนูคืนนี้".
 * Cached against a pantry hash in the real backend (ai_suggestions table);
 * here it's just a plain object produced by MockPantryRepo.
 */
export interface RecipeSuggestion {
  id: string;
  name_th: string;
  /** Estimated cook time in minutes. */
  time_minutes: number;
  /** Short one-line description / why it's suggested. */
  description_th: string;
  ingredients: RecipeIngredient[];
  steps_th: string[];
}

/** Minimal household member / profile shape, used by auth + greeting copy. */
export interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

/** Result of marking a recipe as cooked — used to drive the confirm toast. */
export interface MarkCookedResult {
  recipe: RecipeSuggestion;
  updatedItems: PantryItem[];
}

/** Result of adding a pantry item via quick-pick or free text. */
export interface AddItemResult {
  item: PantryItem;
  /** True if this call incremented an existing entry rather than creating a new one. */
  wasIncrement: boolean;
}
