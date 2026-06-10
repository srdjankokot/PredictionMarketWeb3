'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ToastKind = 'info' | 'success' | 'error' | 'pending';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  persistent?: boolean;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, opts?: { persistent?: boolean; id?: number }) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<ToastContextValue['push']>(
    (kind, message, opts) => {
      const id = opts?.id ?? ++counter;
      setToasts((prev) => {
        const next = prev.filter((t) => t.id !== id);
        return [...next, { id, kind, message, persistent: opts?.persistent }];
      });
      if (!opts?.persistent && kind !== 'pending') {
        setTimeout(() => dismiss(id), 4500);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const accent =
    toast.kind === 'success'
      ? 'text-yes'
      : toast.kind === 'error'
        ? 'text-no'
        : toast.kind === 'pending'
          ? 'text-brand'
          : 'text-ink';
  return (
    <div className="pointer-events-auto flex animate-fade-in items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg shadow-black/40">
      <span className={`mt-0.5 text-sm ${accent}`}>
        {toast.kind === 'pending' ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : toast.kind === 'success' ? (
          '✓'
        ) : toast.kind === 'error' ? (
          '✕'
        ) : (
          'ℹ'
        )}
      </span>
      <p className="flex-1 text-sm text-ink">{toast.message}</p>
      <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
