'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Category } from '@predictx/shared';
import { useToast } from '@/components/shared/Toast';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { useRole } from '@/hooks/useRole';
import { slugify } from '@/lib/categories';

export default function CategoriesPage() {
  const { role, address, isLoading } = useRole();
  const { push } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎲');
  const [slug, setSlug] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/categories');
    if (res.ok) {
      const data = (await res.json()) as { categories: Category[] };
      setCategories(data.categories);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) return <Skeleton className="mx-auto mt-10 h-40 w-full max-w-2xl" />;
  if (role !== 'ADMIN' || !address) {
    return <EmptyState icon="⛔" title="Admins only" description="Only the admin wallet can manage categories." />;
  }

  const computedSlug = slug ? slugify(slug) : slugify(name);

  async function add() {
    if (name.trim().length < 2) {
      push('error', 'Name is too short');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': address! },
        body: JSON.stringify({ name: name.trim(), icon: icon.trim() || '🎲', slug: computedSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add');
      push('success', `Added ${name}`);
      setName('');
      setSlug('');
      setIcon('🎲');
      await load();
    } catch (err) {
      push('error', (err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function remove(c: Category) {
    if (!confirm(`Delete “${c.name}”? Markets in it move to Other.`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, {
        method: 'DELETE',
        headers: { 'x-wallet-address': address! },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      push('success', `Deleted ${c.name}`);
      await load();
    } catch (err) {
      push('error', (err as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">Categories</h1>

      {/* Add form */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-16">
          <label className="label">Icon</label>
          <input className="input text-center" value={icon} maxLength={2} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Esports" />
        </div>
        <div className="flex-1">
          <label className="label">Slug</label>
          <input
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={computedSlug || 'auto-generated'}
          />
        </div>
        <button onClick={add} disabled={adding} className="btn btn-primary">
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="card divide-y divide-[var(--color-border)]">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <span className="text-2xl">{c.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{c.name}</p>
                <p className="text-xs text-muted">
                  /{c.slug} · {c.marketCount ?? 0} markets
                </p>
              </div>
              {c.isDefault ? (
                <span className="badge badge-active">Default</span>
              ) : (
                <button onClick={() => remove(c)} className="text-sm text-no hover:underline">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
