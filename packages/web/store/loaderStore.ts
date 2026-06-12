import { create } from 'zustand';

/**
 * Global blocking loader. Any on-chain action calls show()/hide() (imperatively
 * via getState() is fine) to put up a full-screen overlay that blocks the UI
 * until the action resolves.
 */
interface LoaderState {
  active: boolean;
  message: string;
  show: (message?: string) => void;
  hide: () => void;
}

export const useLoaderStore = create<LoaderState>((set) => ({
  active: false,
  message: '',
  show: (message = 'Working…') => set({ active: true, message }),
  hide: () => set({ active: false }),
}));

/** Imperative helpers for use outside React render (action handlers). */
export const loader = {
  show: (m?: string) => useLoaderStore.getState().show(m),
  hide: () => useLoaderStore.getState().hide(),
};
