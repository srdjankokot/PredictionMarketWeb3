import type { Market } from '@predictx/shared';
import { MarketCard } from '@/components/market/MarketCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { MarketCardSkeleton } from '@/components/shared/Skeleton';

export function MarketGrid({
  markets,
  isLoading,
}: {
  markets: Market[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MarketCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="No markets here yet"
        description="Try a different category or check back soon."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((m) => (
        <div key={m.id} className="animate-fade-in">
          <MarketCard market={m} />
        </div>
      ))}
    </div>
  );
}
