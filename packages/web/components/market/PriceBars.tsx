import { formatPercent } from '@/lib/format';

/**
 * The YES/NO probability bars shared by the market card and detail header.
 * Widths transition smoothly so a live trade visibly animates the bar.
 */
export function PriceBars({
  yesLabel,
  noLabel,
  yesPrice,
  compact = false,
}: {
  yesLabel: string;
  noLabel: string;
  yesPrice: number;
  compact?: boolean;
}) {
  const yesPct = Math.max(0, Math.min(100, Math.round(yesPrice * 100)));
  const noPct = 100 - yesPct;

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <Bar label={yesLabel} pct={yesPct} side="yes" />
      <Bar label={noLabel} pct={noPct} side="no" />
    </div>
  );
}

function Bar({ label, pct, side }: { label: string; pct: number; side: 'yes' | 'no' }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`relative h-7 flex-1 overflow-hidden rounded-md ${side === 'yes' ? 'tint-yes' : 'tint-no'}`}>
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: `color-mix(in srgb, var(--color-${side}) 32%, transparent)` }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-ink">
          <span className={side === 'yes' ? 'text-yes' : 'text-no'}>●</span>
          <span className="ml-1.5 truncate">{label}</span>
        </span>
      </div>
      <span className={`w-10 text-right text-sm font-bold ${side === 'yes' ? 'text-yes' : 'text-no'}`}>
        {formatPercent(pct / 100)}
      </span>
    </div>
  );
}
