export type TabKey = 'tonight' | 'pantry' | 'add';

interface TabDefinition {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: TabDefinition[] = [
  { key: 'tonight', label: 'เมนูคืนนี้', icon: '🍳' },
  { key: 'pantry', label: 'ตู้ของฉัน', icon: '🧊' },
  { key: 'add', label: 'เพิ่มของ', icon: '➕' },
];

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

/**
 * Fixed bottom tab bar, mobile-first (~390px). Three tabs, no router —
 * App.tsx holds the active tab in local state.
 */
export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="เมนูหลัก"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-600' : 'text-gray-400'
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
