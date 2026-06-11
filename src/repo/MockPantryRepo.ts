import { addDaysIso, todayIso } from '../lib/date';
import type {
  AddItemResult,
  CatalogItem,
  MarkCookedResult,
  PantryItem,
  QtyState,
  RecipeSuggestion,
} from '../types/pantry';
import { CATALOG_SEED } from './catalogSeed';
import type { PantryRepo } from './PantryRepo';
import { buildPantrySeed } from './pantrySeed';
import { RECIPE_SEED_SETS } from './recipeSeed';

const HOUSEHOLD_ID = 'mock-household';

/** Simulate a tiny bit of network latency so loading states are visible/testable. */
const MOCK_DELAY_MS = 150;

function delay<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

let idCounter = 1000;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * In-memory implementation of {@link PantryRepo}, seeded with realistic
 * Thai pantry data. State lives for the lifetime of the page (resets on
 * reload) — good enough to demonstrate the full add -> suggest -> cook
 * loop without a backend.
 *
 * Swap-in note: a future `SupabasePantryRepo` implements the exact same
 * interface against Postgres; components depend only on `PantryRepo`.
 */
export class MockPantryRepo implements PantryRepo {
  private pantryItems: PantryItem[];
  private catalogItems: CatalogItem[];
  private suggestionSetIndex = 0;

  constructor() {
    this.pantryItems = buildPantrySeed();
    this.catalogItems = CATALOG_SEED;
  }

  async listPantryItems(opts?: { status?: PantryItem['status'][] }): Promise<PantryItem[]> {
    const statuses = opts?.status ?? ['active'];
    const items = this.pantryItems.filter((item) => statuses.includes(item.status));
    return delay([...items]);
  }

  async listCatalogItems(): Promise<CatalogItem[]> {
    return delay([...this.catalogItems]);
  }

  async addItem(input: {
    catalogItemId?: string;
    freeTextName?: string;
    expiryDate?: string;
    qtyState?: QtyState;
  }): Promise<AddItemResult> {
    const now = new Date().toISOString();

    if (input.catalogItemId) {
      const catalog = this.catalogItems.find((c) => c.id === input.catalogItemId);
      if (!catalog) {
        throw new Error(`Unknown catalog item: ${input.catalogItemId}`);
      }

      // Quick-pick: if an active item from this catalog entry already
      // exists, "tap again" semantics -> add a fresh entry that refreshes
      // the expiry, but we still surface it as an increment for UI feedback.
      const existing = this.pantryItems.find(
        (item) => item.catalog_item_id === catalog.id && item.status === 'active',
      );

      const expiry = input.expiryDate ?? addDaysIso(catalog.default_shelf_life_days);

      if (existing) {
        existing.expiry_date = expiry;
        existing.qty_state = input.qtyState ?? 'full';
        existing.updated_at = now;
        return delay({ item: { ...existing }, wasIncrement: true });
      }

      const item: PantryItem = {
        id: nextId('p'),
        household_id: HOUSEHOLD_ID,
        catalog_item_id: catalog.id,
        free_text_name: null,
        name_th: catalog.name_th,
        category: catalog.category,
        icon: catalog.icon,
        qty_state: input.qtyState ?? 'full',
        expiry_date: expiry,
        status: 'active',
        created_at: now,
        updated_at: now,
      };
      this.pantryItems.unshift(item);
      return delay({ item: { ...item }, wasIncrement: false });
    }

    if (input.freeTextName) {
      const expiry = input.expiryDate ?? addDaysIso(7); // CLAUDE.md: free text defaults to +7 days
      const item: PantryItem = {
        id: nextId('p'),
        household_id: HOUSEHOLD_ID,
        catalog_item_id: null,
        free_text_name: input.freeTextName,
        name_th: input.freeTextName,
        category: 'other',
        icon: '🧺',
        qty_state: input.qtyState ?? 'full',
        expiry_date: expiry,
        status: 'active',
        created_at: now,
        updated_at: now,
      };
      this.pantryItems.unshift(item);
      return delay({ item: { ...item }, wasIncrement: false });
    }

    throw new Error('addItem requires either catalogItemId or freeTextName');
  }

  async updateQtyState(itemId: string, qtyState: QtyState): Promise<PantryItem> {
    const item = this.findItemOrThrow(itemId);
    item.qty_state = qtyState;
    item.updated_at = new Date().toISOString();
    return delay({ ...item });
  }

  async markConsumed(itemId: string): Promise<PantryItem> {
    const item = this.findItemOrThrow(itemId);
    item.status = 'consumed';
    item.qty_state = 'out';
    item.updated_at = new Date().toISOString();
    return delay({ ...item });
  }

  async markDiscarded(itemId: string): Promise<PantryItem> {
    const item = this.findItemOrThrow(itemId);
    item.status = 'discarded';
    item.qty_state = 'out';
    item.updated_at = new Date().toISOString();
    return delay({ ...item });
  }

  async removeItem(itemId: string): Promise<void> {
    this.pantryItems = this.pantryItems.filter((item) => item.id !== itemId);
    return delay(undefined);
  }

  async getSuggestions(opts?: { shuffle?: boolean }): Promise<RecipeSuggestion[]> {
    if (opts?.shuffle) {
      this.suggestionSetIndex = (this.suggestionSetIndex + 1) % RECIPE_SEED_SETS.length;
    }
    const set = RECIPE_SEED_SETS[this.suggestionSetIndex];
    return delay(set.map((recipe) => ({ ...recipe, ingredients: [...recipe.ingredients] })));
  }

  async markCooked(recipeId: string): Promise<MarkCookedResult> {
    const set = RECIPE_SEED_SETS[this.suggestionSetIndex];
    const recipe = set.find((r) => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Unknown recipe: ${recipeId}`);
    }

    const updatedItems: PantryItem[] = [];
    const now = new Date().toISOString();

    for (const ingredient of recipe.ingredients) {
      const item = this.pantryItems.find((p) => p.id === ingredient.pantry_item_id && p.status === 'active');
      if (!item) continue;

      // Cooking IS the consumption log: decrement coarse qty, or mark
      // consumed entirely once it's already at the lowest state.
      if (item.qty_state === 'full') {
        item.qty_state = 'half';
      } else if (item.qty_state === 'half') {
        item.qty_state = 'out';
        item.status = 'consumed';
      } else {
        item.status = 'consumed';
      }
      item.updated_at = now;
      updatedItems.push({ ...item });
    }

    return delay({ recipe: { ...recipe }, updatedItems });
  }

  private findItemOrThrow(itemId: string): PantryItem {
    const item = this.pantryItems.find((p) => p.id === itemId);
    if (!item) {
      throw new Error(`Pantry item not found: ${itemId}`);
    }
    return item;
  }
}

/** Re-export for convenience in seed-related debugging. */
export { todayIso };
