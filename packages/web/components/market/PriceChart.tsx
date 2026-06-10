'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface PricePoint {
  /** epoch ms */
  t: number;
  /** YES price 0..1 */
  yes: number;
}

const RANGES = [
  { key: '1D', ms: 24 * 60 * 60 * 1000 },
  { key: '1W', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

/**
 * YES-probability over time. History is seeded with the market's opening price
 * and current price; live trades append points in realtime (MVP — full on-chain
 * price history would be reconstructed from event logs in a later iteration).
 */
export function PriceChart({ points }: { points: PricePoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('1W');

  const data = useMemo(() => {
    const cutoff = Date.now() - (RANGES.find((r) => r.key === range)?.ms ?? 0);
    const filtered = points.filter((p) => p.t >= cutoff);
    const series = filtered.length >= 2 ? filtered : points;
    return series.map((p) => ({
      time: new Date(p.t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
      yes: Math.round(p.yes * 100),
    }));
  }, [points, range]);

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Price history</h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                range === r.key ? 'tint-brand text-brand' : 'text-muted hover:text-ink'
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="yesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-yes)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-yes)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} minTickGap={32} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}%`, 'YES']}
            />
            <Area
              type="monotone"
              dataKey="yes"
              stroke="var(--color-yes)"
              strokeWidth={2}
              fill="url(#yesFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
