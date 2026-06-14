import { useCallback, useEffect, useState } from 'react';
import { useRepo } from '../../hooks/useRepo';
import { addDaysIso, formatThaiShortDate, todayIso } from '../../lib/date';
import type { CatalogItem, PantryItem } from '../../types/pantry';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';

interface AddItemTabProps {
  showToast: (message: string, opts?: { actionLabel?: string; onAction?: () => void }) => void;
}

interface RecentEntry {
  item: PantryItem;
  /** Local counter of how many times this catalog item was tapped this session. */
  tapCount: number;
}

const FREE_TEXT_DEFAULT_DAYS = 7;

/**
 * Tab 3: "เพิ่มของ".
 *
 * - Quick-pick grid: tap a catalog chip to add it with its default
 *   shelf life — instant toast feedback. Tapping the same chip again
 *   increments the on-screen tap counter ("+2", "+3"...) and refreshes
 *   the pantry entry's expiry.
 * - Free text: name + expiry date (defaults to +7 days).
 * - Recently-added list (this session) with per-item "เลิกทำ" (undo)
 *   that calls `repo.removeItem`.
 */
export function AddItemTab({ showToast }: AddItemTabProps) {
  const repo = useRepo();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [freeTextName, setFreeTextName] = useState('');
  const [freeTextDate, setFreeTextDate] = useState(addDaysIso(FREE_TEXT_DEFAULT_DAYS));
  const [isAddingFreeText, setIsAddingFreeText] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await repo.listCatalogItems();
      setCatalog(items);
    } catch {
      setError('โหลดรายการไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleQuickPick(catalogItem: CatalogItem) {
    setPendingId(catalogItem.id);
    try {
      const result = await repo.addItem({ catalogItemId: catalogItem.id });

      let newTapCount = 1;
      setRecent((prev) => {
        const existingIndex = prev.findIndex((entry) => entry.item.catalog_item_id === catalogItem.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          const existing = updated[existingIndex];
          newTapCount = existing.tapCount + 1;
          updated[existingIndex] = { item: result.item, tapCount: newTapCount };
          // Move to top of recently-added.
          const [moved] = updated.splice(existingIndex, 1);
          return [moved, ...updated];
        }
        return [{ item: result.item, tapCount: 1 }, ...prev];
      });

      const label = newTapCount > 1 ? `เพิ่ม ${catalogItem.name_th} แล้ว (+${newTapCount})` : `เพิ่ม ${catalogItem.name_th} แล้ว`;

      showToast(label, {
        actionLabel: 'เลิกทำ',
        onAction: () => void handleUndo(result.item),
      });
    } catch {
      showToast('เพิ่มไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setPendingId(null);
    }
  }

  async function handleUndo(item: PantryItem) {
    try {
      await repo.removeItem(item.id);
      setRecent((prev) => prev.filter((entry) => entry.item.id !== item.id));
      showToast(`เลิกเพิ่ม "${item.name_th}" แล้ว`);
    } catch {
      showToast('เลิกทำไม่สำเร็จ');
    }
  }

  async function handleFreeTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = freeTextName.trim();
    if (!name) return;

    setIsAddingFreeText(true);
    try {
      const result = await repo.addItem({ freeTextName: name, expiryDate: freeTextDate });
      setRecent((prev) => [{ item: result.item, tapCount: 1 }, ...prev]);
      showToast(`เพิ่ม "${name}" แล้ว`, {
        actionLabel: 'เลิกทำ',
        onAction: () => void handleUndo(result.item),
      });
      setFreeTextName('');
      setFreeTextDate(addDaysIso(FREE_TEXT_DEFAULT_DAYS));
    } catch {
      showToast('เพิ่มไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setIsAddingFreeText(false);
    }
  }

  if (isLoading) return <LoadingState message="กำลังโหลดรายการ..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">เพิ่มของเข้าตู้</h2>
        <p className="text-xs text-gray-500">แตะเพื่อเพิ่ม ระบบตั้งวันหมดอายุให้อัตโนมัติ</p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">หยิบเร็ว</h3>
        <div className="grid grid-cols-4 gap-2">
          {catalog.map((catalogItem) => {
            const tapCount = recent.find((e) => e.item.catalog_item_id === catalogItem.id)?.tapCount ?? 0;
            return (
              <button
                key={catalogItem.id}
                type="button"
                onClick={() => handleQuickPick(catalogItem)}
                disabled={pendingId === catalogItem.id}
                className="relative flex flex-col items-center gap-1 rounded-xl border border-line bg-white p-2 text-center active:scale-95 disabled:opacity-60"
              >
                {tapCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                    +{tapCount}
                  </span>
                )}
                <span className="text-2xl" aria-hidden="true">
                  {catalogItem.icon}
                </span>
                <span className="text-[11px] leading-tight text-gray-700">{catalogItem.name_th}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">เพิ่มแบบพิมพ์เอง</h3>
        <form onSubmit={handleFreeTextSubmit} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">ชื่อของ</span>
            <input
              type="text"
              value={freeTextName}
              onChange={(e) => setFreeTextName(e.target.value)}
              placeholder="เช่น แกงเขียวหวานเหลือ"
              className="rounded-lg border border-line px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">วันหมดอายุ (ค่าเริ่มต้น +7 วัน)</span>
            <input
              type="date"
              value={freeTextDate}
              min={todayIso()}
              onChange={(e) => setFreeTextDate(e.target.value)}
              className="rounded-lg border border-line px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </label>
          <button
            type="submit"
            disabled={!freeTextName.trim() || isAddingFreeText}
            className="rounded-full bg-primary-600 px-3 py-2 text-sm font-bold text-white btn-pressable disabled:opacity-50"
          >
            {isAddingFreeText ? 'กำลังเพิ่ม...' : '+ เพิ่มของ'}
          </button>
        </form>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">เพิ่งเพิ่มไป</h3>
        {recent.length === 0 ? (
          <EmptyState icon="🛒" message="ยังไม่มีรายการที่เพิ่งเพิ่ม" />
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((entry) => (
              <li
                key={entry.item.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5"
              >
                <span className="text-xl" aria-hidden="true">
                  {entry.item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {entry.item.name_th}
                    {entry.tapCount > 1 && <span className="ml-1 text-xs text-primary-600">×{entry.tapCount}</span>}
                  </p>
                  <p className="text-xs text-gray-500">หมดอายุ {formatThaiShortDate(entry.item.expiry_date)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUndo(entry.item)}
                  className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-gray-600 active:scale-95"
                >
                  เลิกทำ
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
