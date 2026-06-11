import { create } from 'zustand';
import type {
  Market,
  MarketCreatedEvent,
  MarketSort,
  MarketStatus,
  MarketTradeEvent,
} from '@predictx/shared';

/** Listing status filter: open = not yet resolved (active + awaiting resolution). */
export type StatusFilter = 'open' | 'resolved' | 'all';

interface Filters {
  /** category slug or 'all' */
  category: string;
  sort: MarketSort;
  status: StatusFilter;
}

interface MarketState extends Filters {
  markets: Market[];
  isLoading: boolean;
  error: string | null;
  setFilters: (f: Partial<Filters>) => void;
  fetchMarkets: () => Promise<void>;
  /** Realtime: apply a trade to the matching card. */
  applyTrade: (e: MarketTradeEvent) => void;
  /** Realtime: prepend a newly created market. */
  prependCreated: (e: MarketCreatedEvent) => void;
  /** Realtime: flip a card to EXPIRED. */
  setExpired: (marketId: string) => void;
}

function buildQuery(f: Filters): string {
  const p = new URLSearchParams();
  p.set('status', f.status);
  if (f.category !== 'all') p.set('category', f.category);
  p.set('sort', f.sort);
  return p.toString();
}

export const useMarketStore = create<MarketState>((set, get) => ({
  markets: [],
  isLoading: false,
  error: null,
  category: 'all',
  sort: 'volume',
  status: 'open',

  setFilters: (f) => {
    set(f);
    void get().fetchMarkets();
  },

  fetchMarkets: async () => {
    set({ isLoading: true, error: null });
    try {
      const { category, sort, status } = get();
      const res = await fetch(`/api/markets?${buildQuery({ category, sort, status })}`);
      if (!res.ok) throw new Error('Failed to load markets');
      const data = (await res.json()) as { markets: Market[] };
      set({ markets: data.markets, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  applyTrade: (e) =>
    set((state) => ({
      markets: state.markets.map((m) =>
        m.id === e.marketId
          ? { ...m, yesPrice: e.yesPrice, noPrice: e.noPrice, yesPool: e.yesPool, noPool: e.noPool, volume: e.volume }
          : m,
      ),
    })),

  prependCreated: (e) =>
    set((state) => {
      if (state.markets.some((m) => m.id === e.marketId)) return state;
      // Only surface in the current view if it matches the active filters.
      const matchesStatus = state.status === 'all' || state.status === 'ACTIVE';
      const matchesCategory = state.category === 'all' || state.category === e.category.slug;
      if (!matchesStatus || !matchesCategory) return state;
      const market: Market = {
        id: e.marketId,
        contractId: Number(e.marketId),
        question: e.question,
        description: e.description,
        category: e.category,
        endDate: e.endDate,
        resolved: false,
        outcome: null,
        status: 'ACTIVE',
        imageUrl: e.imageUrl,
        yesLabel: e.yesLabel,
        noLabel: e.noLabel,
        yesPool: e.yesPool,
        noPool: e.noPool,
        yesPrice: e.yesPrice,
        noPrice: e.noPrice,
        volume: e.volume,
        createdAt: e.createdAt,
      };
      return { markets: [market, ...state.markets] };
    }),

  setExpired: (marketId) =>
    set((state) => ({
      markets: state.markets.map((m) =>
        m.id === marketId ? { ...m, status: 'EXPIRED' as MarketStatus } : m,
      ),
    })),
}));
