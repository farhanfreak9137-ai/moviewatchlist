'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, RotateCcw, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils/haptics';
import { cn } from '@/lib/utils/cn';

export interface ToastOptions {
  message: string;
  type?: 'info' | 'success' | 'warning';
  icon?: React.ReactNode;
  undoAction?: () => void | Promise<void>;
  undoLabel?: string;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentToast, setCurrentToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentToast(null);
  }, []);

  const showToast = useCallback((options: ToastOptions | string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const toastData: ToastOptions = typeof options === 'string'
      ? { message: options, type: 'info' }
      : options;

    triggerHaptic(toastData.type === 'success' ? 'success' : 'light');
    setCurrentToast({ ...toastData, id: Date.now() });

    const duration = toastData.durationMs || (toastData.undoAction ? 5000 : 3500);
    timerRef.current = setTimeout(() => {
      setCurrentToast(null);
    }, duration);
  }, []);

  const handleUndo = async () => {
    if (!currentToast?.undoAction) return;
    triggerHaptic('medium');
    try {
      await currentToast.undoAction();
    } finally {
      dismissToast();
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      {/* Floating Modern Glassmorphic Toast Notification */}
      {currentToast && (
        <aside
          aria-live="polite"
          className="fixed z-50 left-4 right-4 sm:left-auto sm:right-6 bottom-[calc(4.8rem+env(safe-area-inset-bottom))] lg:bottom-6 max-w-md mx-auto sm:mx-0 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#0f111a]/95 backdrop-blur-xl border border-white/15 text-white shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {currentToast.icon ? (
              currentToast.icon
            ) : currentToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : currentToast.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span className="text-xs font-medium text-slate-200 truncate">
              {currentToast.message}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentToast.undoAction && (
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-sky-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                <span>{currentToast.undoLabel || 'Undo'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={dismissToast}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
