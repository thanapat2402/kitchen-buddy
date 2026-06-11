import { useContext } from 'react';
import { RepoContext } from '../lib/repoContext';
import type { PantryRepo } from '../repo/PantryRepo';

/** Access the active {@link PantryRepo} implementation (mock for now). */
export function useRepo(): PantryRepo {
  return useContext(RepoContext);
}
