import { useState } from 'react';
import { AuthProvider } from './hooks/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { TabBar, type TabKey } from './components/TabBar';
import { TonightTab } from './components/tabs/TonightTab';
import { PantryTab } from './components/tabs/PantryTab';
import { AddItemTab } from './components/tabs/AddItemTab';
import { ToastContainer } from './components/ui/Toast';
import { useToasts } from './hooks/useToasts';

function AppShell() {
  const { user, isLoading, error, isMock } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('tonight');
  const { toasts, showToast, dismissToast } = useToasts();

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50 px-6 text-center">
        <div>
          <p className="text-base font-semibold text-red-600">เข้าสู่ระบบไม่สำเร็จ</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Kitchen Buddy</h1>
          <p className="text-xs text-gray-500">สวัสดี {user?.displayName ?? 'คุณ'}</p>
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
