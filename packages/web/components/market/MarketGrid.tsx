'use client';

import { motion, type Variants } from 'framer-motion';
import type { Market } from '@predictx/shared';
import { MarketCard } from '@/components/market/MarketCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { MarketCardSkeleton } from '@/components/shared/Skeleton';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export function MarketGrid({ markets, isLoading }: { markets: Market[]; isLoading: boolean }) {
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
        description="Try a different status or category — or check back soon."
      />
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {markets.map((m) => (
        <motion.div key={m.id} variants={item}>
          <MarketCard market={m} />
        </motion.div>
      ))}
    </motion.div>
  );
}
