import type { Market } from '@predictx/shared';

export function ResolutionBanner({ market }: { market: Market }) {
  const wonYes = market.outcome === 'YES';
  const label = wonYes ? market.yesLabel : market.noLabel;
  return (
    <div className={`card p-4 ${wonYes ? 'tint-yes' : 'tint-no'}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Market resolved</p>
      <p className={`mt-1 text-lg font-bold ${wonYes ? 'text-yes' : 'text-no'}`}>{label} won</p>
    </div>
  );
}
