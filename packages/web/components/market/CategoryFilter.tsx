'use client';

import { useEffect, useState } from 'react';
import type { Category, MarketSort } from '@predictx/shared';
import { useMarketStore, type StatusFilter } from '@/store/marketStore';

const SORTS: { value: MarketSort; label: string }[] = [
  { value: 'volume', label: 'Volume' },
  { value: 'new', label: 'New' },
  { value: 'ending', label: 'Ending soon' },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

export function CategoryFilter() {
  const category = useMarketStore((s) => s.category);
  const sort = useMarketStore((s) => s.sort);
  const status = useMarketStore((s) => s.status);
  const setFilters = useMarketStore((s) => s.setFilters);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/categories');
        if (!res.ok) return;
        const data = (await res.json()) as { categories: Category[] };
        setCategories(data.categories);
      } catch {
        // non-fatal
      }
    })();
  }, []);

  return (
    <div className="glass sticky top-14 z-30 -mx-4 mb-4 space-y-2 border-b px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilters({ status: t.value })}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                status === t.value ? 'tint-brand text-brand' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setFilters({ sort: e.target.value as MarketSort })}
          className="input w-auto shrink-0 py-1.5 text-xs"
          aria-label="Sort markets"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="scroll-thin flex items-center gap-2 overflow-x-auto pb-1">
        <Pill active={category === 'all'} onClick={() => setFilters({ category: 'all' })}>
          All
        </Pill>
        {categories.map((c) => (
          <Pill
            key={c.id}
            active={category === c.slug}
            onClick={() => setFilters({ category: c.slug })}
          >
            <span className="mr-1">{c.icon}</span>
            {c.name}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`chip shrink-0 whitespace-nowrap ${active ? 'chip-active' : 'text-muted hover:text-ink'}`}
    >
      {children}
    </button>
  );
}
