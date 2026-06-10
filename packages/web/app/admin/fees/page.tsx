'use client';

import { FeesPanel } from '@/components/admin/FeesPanel';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { useRole } from '@/hooks/useRole';

export default function FeesPage() {
  const { role, isLoading } = useRole();

  if (isLoading) return <Skeleton className="mx-auto mt-10 h-40 w-full max-w-lg" />;
  if (role !== 'ADMIN') {
    return <EmptyState icon="⛔" title="Admins only" description="Only the admin wallet can manage fees." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Treasury & fees</h1>
        <p className="text-sm text-muted">Trading fees collected by the platform, withdrawable by the treasury.</p>
      </div>
      <FeesPanel />
    </div>
  );
}
