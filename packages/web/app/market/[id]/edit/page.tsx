'use client';

import { useEffect, useState } from 'react';
import type { Market } from '@predictx/shared';
import { EditMarketForm } from '@/components/admin/EditMarketForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { useRole } from '@/hooks/useRole';

export default function EditMarketPage({ params }: { params: { id: string } }) {
  const { role, address, isLoading } = useRole();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/markets/${params.id}`);
        if (res.ok) setMarket(((await res.json()) as { market: Market }).market);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (isLoading || loading) return <Skeleton className="mx-auto mt-10 h-72 w-full max-w-xl" />;
  if (role !== 'ADMIN' || !address) {
    return <EmptyState icon="⛔" title="Admins only" description="Only the admin can edit markets." />;
  }
  if (!market) return <EmptyState icon="🔍" title="Market not found" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Edit market</h1>
      <EditMarketForm market={market} adminAddress={address} />
    </div>
  );
}
