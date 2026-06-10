'use client';

import { useEffect, useState } from 'react';
import type { Category, MarketSort } from '@predictx/shared';
import { useMarketStore } from '@/store/marketStore';

const SORTS: { value: MarketSort; label: string }[] = [
  { value: 'volume', label: 'Volume' },
  { value: 'new', label: 'New' },
  { value: 'ending', label: 'Ending soon' },
];

export function CategoryFilter() {
  const category = useMarketStore((s) => s.category);
  const sort = useMarketStore((s) => s.sort);
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
    <div className="glass sticky top-14 z-30 -mx-4 mb-4 border-b px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="scroll-thin flex flex-1 items-center gap-2 overflow-x-auto pb-1">
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
