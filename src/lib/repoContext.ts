import { createContext } from 'react';
import { MockPantryRepo } from '../repo/MockPantryRepo';
import type { PantryRepo } from '../repo/PantryRepo';

/**
 * Default context value. Always `MockPantryRepo` — this is what every
 * consumer gets unless wrapped by `RepoProvider` (see
 * `src/hooks/RepoProvider.tsx`), which is what `App.tsx` actually renders.
 *
 * Kept as a lazily-shared singleton so mock mode (the zero-env default dev
 * experience) is byte-for-byte unchanged: same in-memory state for the
 * lifetime of the page.
 */
export const defaultRepo: PantryRepo = new MockPantryRepo();

export const RepoContext = createContext<PantryRepo>(defaultRepo);
