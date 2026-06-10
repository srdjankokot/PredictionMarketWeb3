'use client';

import { useEffect } from 'react';
import { PendingResolutionList } from '@/components/admin/PendingResolutionList';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { useRole } from '@/hooks/useRole';
import { useAdminStore } from '@/store/adminStore';

export default function ResolvePage() {
  const { role, address, isLoading } = useRole();
  const fetchPending = useAdminStore((s) => s.fetchPending);

  useEffect(() => {
    if (role === 'ADMIN' && address) void fetchPending(address);
  }, [role, address, fetchPending]);

  if (isLoading) return <Skeleton className="mx-auto mt-10 h-40 w-full max-w-3xl" />;
  if (role !== 'ADMIN' || !address) {
    return <EmptyState icon="⛔" title="Admins only" description="Only the admin wallet can resolve markets." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Resolve markets</h1>
        <p className="text-sm text-muted">Expired markets awaiting an outcome, oldest first.</p>
      </div>
      <PendingResolutionList adminAddress={address} />
    </div>
  );
}
