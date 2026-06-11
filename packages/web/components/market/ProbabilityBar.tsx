/**
 * Combined YES/NO probability bar — one rounded track split green (YES) / red (NO),
 * with labels + percentages. Cleaner and more modern than two stacked bars.
 */
export function ProbabilityBar({
  yesLabel,
  noLabel,
  yesPrice,
  size = 'sm',
}: {
  yesLabel: string;
  noLabel: string;
  yesPrice: number;
  size?: 'sm' | 'lg';
}) {
  const yesPct = Math.max(0, Math.min(100, Math.round(yesPrice * 100)));
  const noPct = 100 - yesPct;
  const barH = size === 'lg' ? 'h-3.5' : 'h-2';
  const textSize = size === 'lg' ? 'text-base' : 'text-xs';

  return (
    <div>
      <div className={`mb-1.5 flex items-center justify-between font-semibold tabular-nums ${textSize}`}>
        <span className="flex min-w-0 items-center gap-1.5 text-yes">
          <Dot side="yes" />
          <span className="truncate">{yesLabel}</span> {yesPct}%
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-no">
          {noPct}% <span className="truncate">{noLabel}</span>
          <Dot side="no" />
        </span>
      </div>
      <div className={`flex ${barH} overflow-hidden rounded-full`}>
        <div
          className="transition-[width] duration-500 ease-out"
          style={{ width: `${yesPct}%`, background: 'var(--color-yes)' }}
        />
        <div
          className="transition-[width] duration-500 ease-out"
          style={{ width: `${noPct}%`, background: 'var(--color-no)' }}
        />
      </div>
    </div>
  );
}

function Dot({ side }: { side: 'yes' | 'no' }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: `var(--color-${side})` }}
    />
  );
}
