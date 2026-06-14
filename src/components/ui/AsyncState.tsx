interface AsyncStateProps {
  message?: string;
}

/** Centered loading spinner + label, used while a tab's initial data is in flight. */
export function LoadingState({ message = 'กำลังโหลด...' }: AsyncStateProps) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center px-6 py-10">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Centered error message with optional retry button. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition active:scale-95"
        >
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  message: string;
  hint?: string;
}

/** Centered empty-state message with optional icon and hint line. */
export function EmptyState({ icon = '🗒️', message, hint }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      <p className="text-sm font-medium text-gray-600">{message}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
