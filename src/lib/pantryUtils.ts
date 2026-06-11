import type { QtyState } from '../types/pantry';

/** Returns the next state in the มี → เหลือครึ่ง → หมด → มี cycle. */
export function nextQtyState(current: QtyState): QtyState {
  if (current === 'full') return 'half';
  if (current === 'half') return 'out';
  return 'full';
}
