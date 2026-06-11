import { useCallback, useState } from 'react';
import type { ToastData } from '../components/ui/Toast';

let toastIdCounter = 0;

/** Manages a queue of bottom toasts (confirmations, undo prompts). */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, opts?: { actionLabel?: string; onAction?: () => void }) => {
    toastIdCounter += 1;
    const toast: ToastData = { id: toastIdCounter, message, ...opts };
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
