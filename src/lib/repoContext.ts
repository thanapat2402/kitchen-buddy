import { createContext } from 'react';
import { MockPantryRepo } from '../repo/MockPantryRepo';
import type { PantryRepo } from '../repo/PantryRepo';

/**
 * Single shared repo instance for the app's lifetime.
 *
 * Swap-in note: when the Supabase backend lands, branch here on an env
 * var (e.g. `VITE_SUPABASE_URL`) to construct a `SupabasePantryRepo`
 * instead — components consume this context and never reference
 * `MockPantryRepo` directly.
 */
export const defaultRepo: PantryRepo = new MockPantryRepo();

export const RepoContext = createContext<PantryRepo>(defaultRepo);
