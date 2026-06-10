import { create } from 'zustand';
import type { AdminResolvePendingEvent, PendingResolutionMarket } from '@predictx/shared';

interface AdminState {
  pendingResolutions: PendingResolutionMarket[];
  pendingCount: number;
  /** Fetch pending resolutions (admin). Pass the admin address for the auth header. */
  fetchPending: (adminAddress: string) => Promise<void>;
  /** Realtime: a market just expired and needs resolution. */
  addPending: (e: AdminResolvePendingEvent) => void;
  /** Remove once resolved. */
  removePending: (marketId: string) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  pendingResolutions: [],
  pendingCount: 0,

  fetchPending: async (adminAddress) => {
    try {
      const res = await fetch('/api/admin/resolve/pending', {
        headers: { 'x-wallet-address': adminAddress },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { markets: PendingResolutionMarket[] };
      set({ pendingResolutions: data.markets, pendingCount: data.markets.length });
    } catch {
      // ignore — header badge simply won't update
    }
  },

  addPending: (e) =>
    set((state) => {
      if (state.pendingResolutions.some((m) => m.id === e.marketId)) return state;
      const market: PendingResolutionMarket = {
        id: e.marketId,
        question: e.question,
        endDate: e.endDate,
        yesPool: e.yesPool,
        noPool: e.noPool,
        yesPrice: e.yesPrice,
        noPrice: e.noPrice,
        yesLabel: e.yesLabel,
        noLabel: e.noLabel,
        volume: e.volume,
        imageUrl: e.imageUrl,
      };
      const next = [...state.pendingResolutions, market];
      return { pendingResolutions: next, pendingCount: next.length };
    }),

  removePending: (marketId) => {
    const next = get().pendingResolutions.filter((m) => m.id !== marketId);
    set({ pendingResolutions: next, pendingCount: next.length });
  },
}));
