import type {
  AddItemResult,
  CatalogItem,
  MarkCookedResult,
  PantryItem,
  QtyState,
  RecipeSuggestion,
} from '../types/pantry';

/**
 * Data access boundary for everything pantry-related.
 *
 * `MockPantryRepo` (this leg) implements this against an in-memory store.
 * A future `SupabasePantryRepo` implements the same interface against
 * Postgres + Edge Functions — components must never depend on which one
 * is active, only on this interface (see useAuth/useRepo wiring).
 */
export interface PantryRepo {
  /**
   * List pantry items for the current household.
   * @param opts.status - filter by status; defaults to 'active' only.
   */
  listPantryItems(opts?: { status?: PantryItem['status'][] }): Promise<PantryItem[]>;

  /** List the curated quick-pick catalog (Thai staples). */
  listCatalogItems(): Promise<CatalogItem[]>;

  /**
   * Add an item to the pantry.
   * - From quick-pick: pass `catalogItemId`. Expiry defaults to
   *   `today + default_shelf_life_days`. If an active item with the same
   *   catalog item already exists, this increments/refreshes it instead
   *   of creating a duplicate (see `wasIncrement`).
   * - Free text: pass `freeTextName` (+ optional `expiryDate`, defaults
   *   to today + 7 days per CLAUDE.md rule).
   */
  addItem(input: {
    catalogItemId?: string;
    freeTextName?: string;
    expiryDate?: string; // ISO date, optional override
    qtyState?: QtyState; // defaults to 'full'
  }): Promise<AddItemResult>;

  /** Cycle or set the coarse quantity state of a pantry item. */
  updateQtyState(itemId: string, qtyState: QtyState): Promise<PantryItem>;

  /** Mark an item as consumed (used up normally). */
  markConsumed(itemId: string): Promise<PantryItem>;

  /** Mark an item as discarded (thrown away / spoiled). */
  markDiscarded(itemId: string): Promise<PantryItem>;

  /** Undo the most recent add (used by the "เพิ่มของ" recently-added list). */
  removeItem(itemId: string): Promise<void>;

  /**
   * Get today's recipe suggestions, prioritizing soonest-to-expire items.
   * @param opts.shuffle - request a different set (mock: ขอเมนูใหม่).
   */
  getSuggestions(opts?: { shuffle?: boolean }): Promise<RecipeSuggestion[]>;

  /**
   * Mark a recipe as cooked: decrements/flips the qty_state of its
   * matching pantry ingredients (this IS the consumption log — see
   * CLAUDE.md product rule #3).
   */
  markCooked(recipeId: string): Promise<MarkCookedResult>;
}
