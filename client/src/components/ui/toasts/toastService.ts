import { nanoid } from 'nanoid';
import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastKind;
  title?: string;
  message: string;
  timeoutMs?: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nanoid();
    set((s) => ({ toasts: [...s.toasts, { id, timeoutMs: 5000, ...t }] }));
    if (t.timeoutMs !== 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter(x => x.id !== id) }));
      }, t.timeoutMs ?? 5000);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter(x => x.id !== id) })),
  clear: () => set({ toasts: [] })
}));

export const toast = {
  success: (message: string, title = 'Success') => useToastStore.getState().push({ type: 'success', message, title }),
  error: (message: string, title = 'Error') => useToastStore.getState().push({ type: 'error', message, title }),
  warning: (message: string, title = 'Warning') => useToastStore.getState().push({ type: 'warning', message, title }),
  info: (message: string, title = 'Info') => useToastStore.getState().push({ type: 'info', message, title }),
  custom: (t: Omit<Toast, 'id'>) => useToastStore.getState().push(t),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear()
};
