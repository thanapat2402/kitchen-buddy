import { useCallback, useEffect, useState } from 'react';
import { useRepo } from '../../hooks/useRepo';
import { daysUntil, expiryLabelTh } from '../../lib/date';
import type { PantryItem, RecipeSuggestion } from '../../types/pantry';
import { ErrorState, LoadingState } from '../ui/AsyncState';

interface TonightTabProps {
  showToast: (message: string, opts?: { actionLabel?: string; onAction?: () => void }) => void;
}

const NEAR_EXPIRY_THRESHOLD_DAYS = 1;

/**
 * Tab 1 (default): "เมนูคืนนี้".
 *
 * - Warning strip lists items expiring today/tomorrow.
 * - 2-3 suggestion cards, first one highlighted, each can expand its
 *   steps inline ("ดูวิธีทำ") and be marked cooked ("ทำแล้ว ✓") which
 *   decrements the matching pantry ingredients via the repo.
 * - "ขอเมนูใหม่" requests a different (mock: shuffled) suggestion set.
 */
export function TonightTab({ showToast }: TonightTabProps) {
  const repo = useRepo();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cookingId, setCookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, recipes] = await Promise.all([repo.listPantryItems(), repo.getSuggestions()]);
      setPantryItems(items);
      setSuggestions(recipes);
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const nearExpiryItems = pantryItems
    .filter((item) => daysUntil(item.expiry_date) <= NEAR_EXPIRY_THRESHOLD_DAYS)
    .sort((a, b) => daysUntil(a.expiry_date) - daysUntil(b.expiry_date));

  async function handleShuffle() {
    setIsShuffling(true);
    setExpandedId(null);
    try {
      const recipes = await repo.getSuggestions({ shuffle: true });
      setSuggestions(recipes);
    } catch {
      showToast('ขอเมนูใหม่ไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setIsShuffling(false);
    }
  }

  async function handleMarkCooked(recipe: RecipeSuggestion) {
    setCookingId(recipe.id);
    try {
      const result = await repo.markCooked(recipe.id);
      // Refresh pantry items so the warning strip + ตู้ของฉัน reflect the
      // decremented quantities.
      const items = await repo.listPantryItems();
      setPantryItems(items);
      showToast(`ทำแล้ว ✓ บันทึก "${result.recipe.name_th}" เรียบร้อย`);
    } catch {
      showToast('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setCookingId(null);
    }
  }

  if (isLoading) return <LoadingState message="กำลังเตรียมเมนู..." />;
  if (error) return <ErrorState message={error} onRetry={loadAll} />;

  return (
    <div className="flex flex-col gap-4 p-4">
      {nearExpiryItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-800">⚠️ ของใกล้หมดอายุ</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {nearExpiryItems.map((item) => (
              <li
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800 shadow-sm"
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.name_th}
                <span className="text-amber-500">· {expiryLabelTh(item.expiry_date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">เมนูแนะนำคืนนี้</h2>
        <button
          type="button"
          onClick={handleShuffle}
          disabled={isShuffling}
          className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 active:scale-95 disabled:opacity-50"
        >
          {isShuffling ? 'กำลังหา...' : '🔄 ขอเมนูใหม่'}
        </button>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-gray-500">ยังไม่มีเมนูแนะนำตอนนี้</p>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((recipe, index) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              highlighted={index === 0}
              expanded={expandedId === recipe.id}
              cooking={cookingId === recipe.id}
              onToggleSteps={() => setExpandedId((current) => (current === recipe.id ? null : recipe.id))}
              onMarkCooked={() => handleMarkCooked(recipe)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RecipeCardProps {
  recipe: RecipeSuggestion;
  highlighted: boolean;
  expanded: boolean;
  cooking: boolean;
  onToggleSteps: () => void;
  onMarkCooked: () => void;
}

function RecipeCard({ recipe, highlighted, expanded, cooking, onToggleSteps, onMarkCooked }: RecipeCardProps) {
  const expiringIngredients = recipe.ingredients.filter((ing) => ing.is_expiring_soon);

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition ${
        highlighted ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">{recipe.name_th}</h3>
          <p className="mt-0.5 text-xs text-gray-500">⏱️ {recipe.time_minutes} นาที</p>
        </div>
        {highlighted && (
          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">
            แนะนำ
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-600">{recipe.description_th}</p>

      {expiringIngredients.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          ใช้ของใกล้หมดอายุ: {expiringIngredients.map((ing) => ing.name_th).join(', ')}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {recipe.ingredients.map((ing) => (
          <span
            key={ing.pantry_item_id}
            className={`rounded-full px-2 py-0.5 text-xs ${
              ing.is_expiring_soon ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {ing.name_th}
          </span>
        ))}
      </div>

      {expanded && (
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
          {recipe.steps_th.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onToggleSteps}
          className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 active:scale-95"
        >
          {expanded ? 'ซ่อนวิธีทำ' : 'ดูวิธีทำ'}
        </button>
        <button
          type="button"
          onClick={onMarkCooked}
          disabled={cooking}
          className="flex-1 rounded-full bg-emerald-600 px-3 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
        >
          {cooking ? 'กำลังบันทึก...' : 'ทำแล้ว ✓'}
        </button>
      </div>
    </article>
  );
}
