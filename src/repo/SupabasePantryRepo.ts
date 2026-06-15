import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthedClient } from '../lib/supabaseClient';
import { addDaysIso, todayIso } from '../lib/date';
import { FREE_TEXT_CATEGORY, FREE_TEXT_ICON, iconForName, mapDbCategory } from '../lib/categoryMap';
import type {
  AddItemResult,
  CatalogItem,
  MarkCookedResult,
  PantryItem,
  PantryItemStatus,
  QtyState,
  RecipeSuggestion,
} from '../types/pantry';
import type { SupabaseSession } from '../types/auth';
import type { PantryRepo } from './PantryRepo';

const NEAR_EXPIRY_THRESHOLD_DAYS = 1;
const FREE_TEXT_DEFAULT_DAYS = 7;

/** Row shapes as returned by PostgREST (snake_case, matches the migrations). */
interface CatalogItemRow {
  id: string;
  name_th: string;
  category: string;
  default_shelf_life_days: number;
}

interface PantryItemRow {
  id: string;
  household_id: string;
  catalog_item_id: string | null;
  free_text_name: string | null;
  qty_state: QtyState;
  expiry_date: string | null;
  status: PantryItemStatus;
  created_at: string;
  updated_at: string;
  catalog_items: CatalogItemRow | CatalogItemRow[] | null;
}

interface SuggestUse {
  pantry_item_id: string;
  name_th: string;
  days_left: number;
}

interface SuggestSuggestion {
  id: string;
  name_th: string;
  time_minutes: number;
  uses: SuggestUse[];
  steps: string[];
}

interface SuggestResponse {
  suggestions: SuggestSuggestion[];
  cached: boolean;
  generated_at: string;
}

/**
 * `PantryRepo` implementation backed by Supabase (Postgres + RLS + Edge
 * Functions). Mirrors `MockPantryRepo`'s behavior exactly so tab components
 * never need to branch on which repo is active.
 *
 * Auth: every request is made with the household member's minted Supabase
 * JWT (see `src/services/authService.ts` / `AuthProvider`). On a 401 (token
 * expired or rejected) we re-exchange the LINE id_token via
 * `refreshSession()` once and retry the request — `liff.getIDToken()` is
 * local/cheap so this is safe to do transparently.
 */
export class SupabasePantryRepo implements PantryRepo {
  private client: SupabaseClient;
  private householdIdPromise: Promise<string> | null = null;
  private session: SupabaseSession;
  private readonly refreshSession: () => Promise<SupabaseSession | null>;

  constructor(session: SupabaseSession, refreshSession: () => Promise<SupabaseSession | null>) {
    this.session = session;
    this.refreshSession = refreshSession;
    this.client = createAuthedClient(session.accessToken);
  }

  /**
   * Run `fn` against the current client. If it fails with a Postgres/PostgREST
   * 401 (JWT expired/invalid), re-exchange the session once and retry with a
   * freshly-built client. Any other error (or a second 401) is rethrown.
   */
  private async withAuthRetry<T>(fn: (client: SupabaseClient) => Promise<T>): Promise<T> {
    try {
      return await fn(this.client);
    } catch (err) {
      if (!isUnauthorizedError(err)) throw err;

      const refreshed = await this.refreshSession();
      if (!refreshed) throw err;

      this.session = refreshed;
      this.client = createAuthedClient(refreshed.accessToken);
      this.householdIdPromise = null; // re-resolve under the new identity if needed
      return fn(this.client);
    }
  }

  /** Resolve (and cache) the current user's household_id from household_members. */
  private async getHouseholdId(): Promise<string> {
    if (!this.householdIdPromise) {
      this.householdIdPromise = this.withAuthRetry(async (client) => {
        const { data, error } = await client
          .from('household_members')
          .select('household_id')
          .eq('user_id', this.session.appUserId)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('ไม่พบบ้านของผู้ใช้นี้ (household_members)');
        return data.household_id as string;
      }).catch((err) => {
        // Don't cache a rejected promise — allow retry on next call.
        this.householdIdPromise = null;
        throw err;
      });
    }
    return this.householdIdPromise;
  }

  async listPantryItems(opts?: { status?: PantryItem['status'][] }): Promise<PantryItem[]> {
    const statuses = opts?.status ?? ['active'];
    const householdId = await this.getHouseholdId();

    const rows = await this.withAuthRetry(async (client) => {
      const { data, error } = await client
        .from('pantry_items')
        .select(
          'id, household_id, catalog_item_id, free_text_name, qty_state, expiry_date, status, created_at, updated_at, catalog_items(id, name_th, category, default_shelf_life_days)',
        )
        .eq('household_id', householdId)
        .in('status', statuses)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as PantryItemRow[];
    });

    return rows.map(mapPantryItemRow);
  }

  async listCatalogItems(): Promise<CatalogItem[]> {
    const rows = await this.withAuthRetry(async (client) => {
      const { data, error } = await client
        .from('catalog_items')
        .select('id, name_th, category, default_shelf_life_days')
        .order('name_th', { ascending: true });

      if (error) throw error;
      return (data ?? []) as CatalogItemRow[];
    });

    return rows.map(mapCatalogItemRow);
  }

  async addItem(input: {
    catalogItemId?: string;
    freeTextName?: string;
    expiryDate?: string;
    qtyState?: QtyState;
  }): Promise<AddItemResult> {
    const householdId = await this.getHouseholdId();

    if (input.catalogItemId) {
      const catalog = await this.withAuthRetry(async (client) => {
        const { data, error } = await client
          .from('catalog_items')
          .select('id, name_th, category, default_shelf_life_days')
          .eq('id', input.catalogItemId as string)
          .single();
        if (error) throw error;
        return data as CatalogItemRow;
      });

      const expiry = input.expiryDate ?? addDaysIso(catalog.default_shelf_life_days);

      // Quick-pick "tap again" semantics: refresh the existing active entry
      // for this catalog item instead of creating a duplicate row.
      const existing = await this.withAuthRetry(async (client) => {
        const { data, error } = await client
          .from('pantry_items')
          .select(
            'id, household_id, catalog_item_id, free_text_name, qty_state, expiry_date, status, created_at, updated_at, catalog_items(id, name_th, category, default_shelf_life_days)',
          )
          .eq('household_id', householdId)
          .eq('catalog_item_id', catalog.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data as PantryItemRow | null;
      });

      if (existing) {
        const updated = await this.withAuthRetry(async (client) => {
          const { data, error } = await client
            .from('pantry_items')
            .update({ expiry_date: expiry, qty_state: input.qtyState ?? 'full' })
            .eq('id', existing.id)
            .select(
              'id, household_id, catalog_item_id, free_text_name, qty_state, expiry_date, status, created_at, updated_at, catalog_items(id, name_th, category, default_shelf_life_days)',
            )
            .single();
          if (error) throw error;
          return data as PantryItemRow;
        });

        return { item: mapPantryItemRow(updated), wasIncrement: true };
      }

      const inserted = await this.withAuthRetry(async (client) => {
        const { data, error } = await client
          .from('pantry_items')
          .insert({
            household_id: householdId,
            catalog_item_id: catalog.id,
            qty_state: input.qtyState ?? 'full',
            expiry_date: expiry,
            status: 'active',
            added_by: this.session.appUserId,
          })
          .select(
            'id, household_id, catalog_item_id, free_text_name, qty_state, expiry_date, status, created_at, updated_at, catalog_items(id, name_th, category, default_shelf_life_days)',
          )
          .single();
        if (error) throw error;
        return data as PantryItemRow;
      });

      return { item: mapPantryItemRow(inserted), wasIncrement: false };
    }

    if (input.freeTextName) {
      const expiry = input.expiryDate ?? addDaysIso(FREE_TEXT_DEFAULT_DAYS);

      const inserted = await this.withAuthRetry(async (client) => {
        const { data, error } = await client
          .from('pantry_items')
          .insert({
            household_id: householdId,
            free_text_name: input.freeTextName,
            qty_state: input.qtyState ?? 'full',
            expiry_date: expiry,
            status: 'active',
            added_by: this.session.appUserId,
          })
          .select(
            'id, household_id, catalog_item_id, free_text_name, qty_state, expiry_date, status, created_at, updated_at, catalog_items(id, name_th, category, default_shelf_life_days)',
          )
          .single();
        if (error) throw error;
        return data as PantryItemRow;
      });

      return { item: mapPantryItemRow(inserted), wasIncrement: false };
    }

    throw new Error('addItem requires either catalogItemId or freeTextName');
  }

  async updateQtyState(itemId: string, qtyState: QtyState): Promise<PantryItem> {
    const updated = await this.withAuthRetry(async (client) => {
      const { data, error } = await client
        .from('pantry_items')
        .update({ qty_state: qtyState })
        .eq('id', itemId)
        .select(
          'id, household_id, catalog_item_id, free_text_name, qty_state, expiry_date, status, created_at, updated_at, catalog_items(id, name_th, category, default_shelf_life_days)',
        )
        .single();
      if (error) throw error;
      return data as PantryItemRow;
    });

    return mapPantryItemRow(updated);
  }

  async markConsumed(itemId: string): Promise<PantryItem> {
    return this.setStatus(itemId, 'consumed');
  }

  async markDiscarded(itemId: string): Promise<PantryItem> {
    return this.setStatus(itemId, 'discarded');
  }

  /**
   * UPDATE pantry_items.status -> 'consumed' | 'discarded'. The
   * `pantry_items_log_status_change` trigger writes the corresponding
   * consume_log row automatically — never insert into consume_log directly
   * (RLS rejects it by design, see migration 20260611120200).
   */
  private async setStatus(itemId: string, status: 'consumed' | 'discarded'): Promise<PantryItem> {
    const updated = await this.withAuthRetry(async (client) => {
      const { data, error } = await client
        .from('pantry_items')
        .update({ status, qty_state: 'out' })
        .eq('id', itemId)
        .select(
          'id, household_id, catalog_item_id, free_text_name, qty_state, expiry_date, status, created_at, updated_at, catalog_items(id, name_th, category, default_shelf_life_days)',
        )
        .single();
      if (error) throw error;
      return data as PantryItemRow;
    });

    return mapPantryItemRow(updated);
  }

  async removeItem(itemId: string): Promise<void> {
    await this.withAuthRetry(async (client) => {
      const { error } = await client.from('pantry_items').delete().eq('id', itemId);
      if (error) throw error;
    });
  }

  async getSuggestions(opts?: { shuffle?: boolean }): Promise<RecipeSuggestion[]> {
    const response = await this.callSuggest({ force_refresh: opts?.shuffle ?? false });
    return response.suggestions.map(mapSuggestion);
  }

  /**
   * Mark a recipe as cooked.
   *
   * The `suggest` function doesn't expose a "mark cooked" endpoint — cooking
   * IS the consumption log (CLAUDE.md rule #3), so we apply the
   * full->half / half|out->consumed decrement rule directly on
   * `pantry_items` for every ingredient in `recipe.ingredients` whose
   * `pantry_item_id` matches an active row. This mirrors `MockPantryRepo`.
   */
  async markCooked(recipeId: string): Promise<MarkCookedResult> {
    // Re-fetch the current suggestion set so we have its ingredient list —
    // suggestions are cached server-side (pantry_hash), so this is cheap and
    // guarantees we act on the same recipe the user saw.
    const response = await this.callSuggest({ force_refresh: false });
    const recipe = response.suggestions.find((r) => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Unknown recipe: ${recipeId}`);
    }

    const activeItems = await this.listPantryItems();
    const updatedItems: PantryItem[] = [];

    for (const use of recipe.uses) {
      const item = activeItems.find((p) => p.id === use.pantry_item_id && p.status === 'active');
      if (!item) continue;

      if (item.qty_state === 'full') {
        updatedItems.push(await this.updateQtyState(item.id, 'half'));
      } else if (item.qty_state === 'half') {
        updatedItems.push(await this.setStatus(item.id, 'consumed'));
      } else {
        updatedItems.push(await this.setStatus(item.id, 'consumed'));
      }
    }

    return { recipe: mapSuggestion(recipe), updatedItems };
  }

  /** POST /functions/v1/suggest with the current access token. */
  private async callSuggest(body: { force_refresh?: boolean }): Promise<SuggestResponse> {
    return this.withAuthRetry(async (client) => {
      const { data, error } = await client.functions.invoke<SuggestResponse>('suggest', {
        body,
      });
      if (error) throw error;
      if (!data) throw new Error('ไม่ได้รับข้อมูลเมนูแนะนำ');
      return data;
    });
  }
}

/**
 * Heuristic: does this error represent an expired/invalid JWT that a
 * `refreshSession()` + retry could fix?
 *
 * - PostgREST (`PostgrestError`) reports this as `code: 'PGRST301'` ("JWT
 *   expired") — there's no numeric HTTP status on the error object itself.
 * - Edge Functions (`FunctionsHttpError`) carry the original `Response` as
 *   `context`, so `context.status === 401`.
 * - Some shapes expose a bare numeric `status` of 401 directly.
 */
function isUnauthorizedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const status = (err as { status?: number }).status;
  if (status === 401) return true;

  const context = (err as { context?: { status?: number } }).context;
  if (context?.status === 401) return true;

  const code = (err as { code?: string | number }).code;
  return code === 'PGRST301' || code === 401 || code === '401';
}

function mapCatalogItemRow(row: CatalogItemRow): CatalogItem {
  const category = mapDbCategory(row.category);
  return {
    id: row.id,
    name_th: row.name_th,
    category,
    default_shelf_life_days: row.default_shelf_life_days,
    icon: iconForName(row.name_th, category),
    is_seed: true,
  };
}

function mapPantryItemRow(row: PantryItemRow): PantryItem {
  const catalog = Array.isArray(row.catalog_items) ? row.catalog_items[0] : row.catalog_items;
  const category = catalog ? mapDbCategory(catalog.category) : FREE_TEXT_CATEGORY;
  const name = catalog?.name_th ?? row.free_text_name ?? '';

  return {
    id: row.id,
    household_id: row.household_id,
    catalog_item_id: row.catalog_item_id,
    free_text_name: row.free_text_name,
    name_th: name,
    category,
    icon: catalog ? iconForName(name, category) : FREE_TEXT_ICON,
    qty_state: row.qty_state,
    expiry_date: row.expiry_date ?? todayIso(),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapSuggestion(suggestion: SuggestSuggestion): RecipeSuggestion {
  const expiringNames = suggestion.uses
    .filter((use) => use.days_left <= NEAR_EXPIRY_THRESHOLD_DAYS)
    .map((use) => use.name_th);

  return {
    id: suggestion.id,
    name_th: suggestion.name_th,
    time_minutes: suggestion.time_minutes,
    description_th:
      expiringNames.length > 0 ? `ใช้ของใกล้หมดอายุ: ${expiringNames.join(', ')}` : 'เมนูแนะนำจากของในตู้',
    ingredients: suggestion.uses.map((use) => ({
      pantry_item_id: use.pantry_item_id,
      name_th: use.name_th,
      is_expiring_soon: use.days_left <= NEAR_EXPIRY_THRESHOLD_DAYS,
    })),
    steps_th: suggestion.steps,
  };
}
