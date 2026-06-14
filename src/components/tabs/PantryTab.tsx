import { useCallback, useEffect, useState } from 'react';
import { useRepo } from '../../hooks/useRepo';
import { daysUntil } from '../../lib/date';
import type { PantryItem } from '../../types/pantry';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';
import { ExpiryBadge } from '../ui/ExpiryBadge';
import { QtyChip } from '../ui/QtyChip';
import { nextQtyState } from '../../lib/pantryUtils';

interface PantryTabProps {
  showToast: (message: string, opts?: { actionLabel?: string; onAction?: () => void }) => void;
}

/**
 * Tab 2: "ตู้ของฉัน" — active pantry items sorted by expiry ascending.
 *
 * - Row background gives a color cue: red for ≤1 day, amber for ≤3 days.
 * - Tapping the qty chip cycles มี → เหลือครึ่ง → หมด → มี.
 * - "ใช้แล้ว" / "ทิ้งแล้ว" remove the item from the active list (consumed/discarded).
 */
export function PantryTab({ showToast }: PantryTabProps) {
  const repo = useRepo();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repo.listPantryItems();
      setItems(data);
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = [...items].sort((a, b) => daysUntil(a.expiry_date) - daysUntil(b.expiry_date));

  async function handleCycleQty(item: PantryItem) {
    const next = nextQtyState(item.qty_state);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, qty_state: next } : i)));
    try {
      await repo.updateQtyState(item.id, next);
    } catch {
      showToast('อัปเดตปริมาณไม่สำเร็จ');
      void load();
    }
  }

  async function handleConsumed(item: PantryItem) {
    setBusyId(item.id);
    try {
      await repo.markConsumed(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`ใช้ "${item.name_th}" แล้ว`);
    } catch {
      showToast('บันทึกไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDiscarded(item: PantryItem) {
    setBusyId(item.id);
    try {
      await repo.markDiscarded(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`ทิ้ง "${item.name_th}" แล้ว`);
    } catch {
      showToast('บันทึกไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <LoadingState message="กำลังโหลดตู้ของ..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (sorted.length === 0) {
    return <EmptyState icon="🧊" message="ตู้ของว่างเปล่า" hint='ไปที่แท็บ "เพิ่มของ" เพื่อเริ่มเพิ่มของในตู้' />;
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <h2 className="text-lg font-bold text-gray-900">ตู้ของฉัน</h2>
      <ul className="flex flex-col gap-2">
        {sorted.map((item) => {
          const diff = daysUntil(item.expiry_date);
          const rowTone =
            diff <= 1 ? 'border-red-200 bg-red-50' : diff <= 3 ? 'border-amber-200 bg-amber-50' : 'border-line bg-white';

          return (
            <li key={item.id} className={`rounded-xl border p-3 ${rowTone}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.name_th}</p>
                  <ExpiryBadge expiryDate={item.expiry_date} className="mt-1" />
                </div>
                <QtyChip qtyState={item.qty_state} onClick={() => handleCycleQty(item)} />
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleConsumed(item)}
                  disabled={busyId === item.id}
                  className="flex-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:scale-95 disabled:opacity-50"
                >
                  ใช้แล้ว
                </button>
                <button
                  type="button"
                  onClick={() => handleDiscarded(item)}
                  disabled={busyId === item.id}
                  className="flex-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:scale-95 disabled:opacity-50"
                >
                  ทิ้งแล้ว
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
