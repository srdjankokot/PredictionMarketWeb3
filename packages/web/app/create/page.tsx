'use client';

import { CreateMarketForm } from '@/components/admin/CreateMarketForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { useRole } from '@/hooks/useRole';

export default function CreatePage() {
  const { role, address, isLoading } = useRole();

  if (isLoading) return <Skeleton className="mx-auto mt-10 h-72 w-full max-w-3xl" />;
  if (role !== 'ADMIN' || !address) {
    return <EmptyState icon="⛔" title="Admins only" description="Only the admin wallet can create markets." />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Create market</h1>
      <CreateMarketForm adminAddress={address} />
    </div>
  );
}
