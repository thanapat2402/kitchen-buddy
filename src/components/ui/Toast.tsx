import { useEffect } from 'react';

export interface ToastData {
  id: number;
  message: string;
  /** Optional inline action, e.g. "เลิกทำ" (undo). */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: number) => void;
  /** Auto-dismiss delay in ms. */
  duration?: number;
}

/**
 * Small bottom-anchored confirmation toast (e.g. "ทำแล้ว ✓ บันทึกแล้ว",
 * or "เพิ่ม X แล้ว · เลิกทำ"). Auto-dismisses after `duration`.
 */
export function Toast({ toast, onDismiss, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      <span className="flex-1">{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.();
            onDismiss(toast.id);
          }}
          className="font-semibold text-primary-300 active:opacity-70"
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

/** Fixed-position stack of toasts, anchored above the bottom tab bar. */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
