import { useState } from 'react';
import { AuthProvider } from './hooks/AuthProvider';
import { RepoProvider } from './hooks/RepoProvider';
import { useAuth } from './hooks/useAuth';
import { hasSupabaseConfig } from './lib/supabaseClient';
import { TabBar, type TabKey } from './components/TabBar';
import { TonightTab } from './components/tabs/TonightTab';
import { PantryTab } from './components/tabs/PantryTab';
import { AddItemTab } from './components/tabs/AddItemTab';
import { ToastContainer } from './components/ui/Toast';
import { useToasts } from './hooks/useToasts';

function AppShell() {
  const { user, isLoading, error, isMock, session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('tonight');
  const { toasts, showToast, dismissToast } = useToasts();

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas">
        <p className="text-sm text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas px-6 text-center">
        <div>
          <p className="text-base font-semibold text-red-600">เข้าสู่ระบบไม่สำเร็จ</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Real LIFF mode with a real backend configured, but the LINE id_token ->
  // Supabase JWT exchange hasn't produced a session yet (in-flight failure
  // not surfaced as a hard `error` above). Show this instead of silently
  // falling back to mock data, which would hide a real auth problem.
  if (!isMock && hasSupabaseConfig && !session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas px-6 text-center">
        <div>
          <p className="text-base font-semibold text-red-600">เชื่อมต่อระบบไม่สำเร็จ</p>
          <p className="mt-1 text-sm text-gray-500">ลองปิดแล้วเปิดแอปใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }

  return (
    <RepoProvider>
      <div className="mx-auto flex h-dvh max-w-md flex-col bg-canvas">
        <header className="flex items-center justify-between border-b border-line bg-canvas px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-pot-sparkle.svg" alt="" className="h-8 w-8 rounded-[9px]" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Kitchen Buddy</h1>
              <p className="text-xs text-gray-500">สวัสดี {user?.displayName ? `คุณ${user.displayName}` : 'คุณ'}</p>
            </div>
          </div>
          {isMock && (
            <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-700">
              MOCK MODE
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto pb-24">
          {activeTab === 'tonight' && <TonightTab showToast={showToast} />}
          {activeTab === 'pantry' && <PantryTab showToast={showToast} />}
          {activeTab === 'add' && <AddItemTab showToast={showToast} />}
        </main>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>
    </RepoProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
