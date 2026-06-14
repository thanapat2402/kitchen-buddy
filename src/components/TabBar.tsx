import { mealPeriodTh } from '../lib/date';

export type TabKey = 'tonight' | 'pantry' | 'add';

interface TabDefinition {
  key: TabKey;
  label: string;
  icon: string;
}

// `tonight` label tracks the meal period (เมนูเช้านี้ / เที่ยงนี้ / เย็นนี้);
// computed at render so it reflects when the app is actually open.
const STATIC_TABS: Omit<TabDefinition, 'label'>[] = [
  { key: 'tonight', icon: '🍳' },
  { key: 'pantry', icon: '🧊' },
  { key: 'add', icon: '➕' },
];

const STATIC_LABELS: Record<Exclude<TabKey, 'tonight'>, string> = {
  pantry: 'ตู้ของฉัน',
  add: 'เพิ่มของ',
};

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

/**
 * Fixed bottom tab bar, mobile-first (~390px). Three tabs, no router —
 * App.tsx holds the active tab in local state.
 */
export function TabBar({ active, onChange }: TabBarProps) {
  const tabs: TabDefinition[] = STATIC_TABS.map((tab) => ({
    ...tab,
    label: tab.key === 'tonight' ? `เมนู${mealPeriodTh()}` : STATIC_LABELS[tab.key],
  }));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-canvas pb-[env(safe-area-inset-bottom)]"
      aria-label="เมนูหลัก"
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl" aria-hidden="true">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
