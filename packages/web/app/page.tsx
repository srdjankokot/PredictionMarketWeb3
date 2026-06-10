'use client';

import { useEffect } from 'react';
import { CategoryFilter } from '@/components/market/CategoryFilter';
import { MarketGrid } from '@/components/market/MarketGrid';
import { useMarketListSocket } from '@/hooks/useMarketListSocket';
import { useMarketStore } from '@/store/marketStore';

export default function HomePage() {
  const markets = useMarketStore((s) => s.markets);
  const isLoading = useMarketStore((s) => s.isLoading);
  const fetchMarkets = useMarketStore((s) => s.fetchMarkets);

  useEffect(() => {
    void fetchMarkets();
  }, [fetchMarkets]);

  useMarketListSocket();

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-ink">Markets</h1>
        <p className="text-sm text-muted">Bet on the outcome of future events.</p>
      </div>
      <CategoryFilter />
      <MarketGrid markets={markets} isLoading={isLoading} />
    </div>
  );
}
