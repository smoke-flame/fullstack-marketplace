'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type ToastVariant = 'default' | 'destructive' | 'success' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

export function toast(options: {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastItem = {
    id,
    duration: options.duration ?? 5000,
    ...options,
  };
  newToast.duration = newToast.duration ?? 5000;

  toasts = [newToast, ...toasts].slice(0, 5);
  notify();

  if (newToast.duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, newToast.duration);
  }

  return id;
}

toast.error = (title: string, description?: string) => {
  return toast({ title, description, variant: 'destructive' });
};

toast.success = (title: string, description?: string) => {
  return toast({ title, description, variant: 'success' });
};

toast.info = (title: string, description?: string) => {
  return toast({ title, description, variant: 'info' });
};

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function useToast() {
  const [activeToasts, setActiveToasts] = React.useState<ToastItem[]>(toasts);

  React.useEffect(() => {
    listeners.add(setActiveToasts);
    return () => {
      listeners.delete(setActiveToasts);
    };
  }, []);

  return { toasts: activeToasts, dismissToast, toast };
}

export function Toaster() {
  const { toasts: currentToasts, dismissToast: dismiss } = useToast();

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-md flex-col gap-2 p-4 transition-all">
      {currentToasts.map((item) => {
        const isDestructive = item.variant === 'destructive';
        const isSuccess = item.variant === 'success';
        const isInfo = item.variant === 'info';

        return (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex w-full items-start justify-between rounded-lg border p-4 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5',
              isDestructive && 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
              isSuccess && 'border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
              isInfo && 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
              !isDestructive && !isSuccess && !isInfo && 'border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100'
            )}
          >
            <div className="flex gap-3">
              {isDestructive && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />}
              {isSuccess && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />}
              {isInfo && <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />}
              <div>
                <h4 className="text-sm font-semibold">{item.title}</h4>
                {item.description && <p className="mt-1 text-sm opacity-90">{item.description}</p>}
              </div>
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="ml-4 shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none"
              aria-label="Close toast"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
