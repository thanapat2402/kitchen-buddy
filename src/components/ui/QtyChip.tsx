import type { QtyState } from '../../types/pantry';

interface QtyChipProps {
  qtyState: QtyState;
  onClick?: () => void;
  className?: string;
}

const QTY_LABELS: Record<QtyState, string> = {
  full: 'มี',
  half: 'เหลือครึ่ง',
  out: 'หมด',
};

const QTY_STYLES: Record<QtyState, string> = {
  full: 'bg-emerald-100 text-emerald-700',
  half: 'bg-amber-100 text-amber-700',
  out: 'bg-gray-200 text-gray-500',
};

/**
 * Tappable chip showing coarse quantity state (มี / เหลือครึ่ง / หมด).
 * Tapping cycles to the next state — wire `onClick` to call
 * `repo.updateQtyState(item.id, nextState)`.
 */
export function QtyChip({ qtyState, onClick, className = '' }: QtyChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition active:scale-95 ${QTY_STYLES[qtyState]} ${className}`}
      aria-label={`สถานะปริมาณ: ${QTY_LABELS[qtyState]} (แตะเพื่อเปลี่ยน)`}
    >
      {QTY_LABELS[qtyState]}
    </button>
  );
}
