/**
 * Combined YES/NO probability bar — one rounded track split green (YES) / red (NO),
 * with labels + percentages. Optional per-outcome images replace the colored dot.
 */
export function ProbabilityBar({
  yesLabel,
  noLabel,
  yesPrice,
  size = 'sm',
  showLabels = true,
  yesImageUrl,
  noImageUrl,
}: {
  yesLabel: string;
  noLabel: string;
  yesPrice: number;
  size?: 'sm' | 'lg';
  showLabels?: boolean;
  yesImageUrl?: string | null;
  noImageUrl?: string | null;
}) {
  const yesPct = Math.max(0, Math.min(100, Math.round(yesPrice * 100)));
  const noPct = 100 - yesPct;
  const barH = size === 'lg' ? 'h-3.5' : 'h-2';
  const textSize = size === 'lg' ? 'text-base' : 'text-xs';

  return (
    <div>
      {showLabels && (
        <div className={`mb-1.5 flex items-center justify-between font-semibold tabular-nums ${textSize}`}>
          <span className="flex min-w-0 items-center gap-1.5 text-yes">
            <Mark side="yes" image={yesImageUrl} size={size} />
            <span className="truncate">{yesLabel}</span> {yesPct}%
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-no">
            {noPct}% <span className="truncate">{noLabel}</span>
            <Mark side="no" image={noImageUrl} size={size} />
          </span>
        </div>
      )}
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

function Mark({ side, image, size }: { side: 'yes' | 'no'; image?: string | null; size: 'sm' | 'lg' }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt=""
        className={`${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`inline-block ${size === 'lg' ? 'h-2 w-2' : 'h-1.5 w-1.5'} shrink-0 rounded-full`}
      style={{ background: `var(--color-${side})` }}
    />
  );
}
