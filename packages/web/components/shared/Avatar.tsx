/** Deterministic gradient avatar derived from a wallet address. */
export function Avatar({ address, size = 22 }: { address: string; size?: number }) {
  const seed = (address || '0x0').toLowerCase();
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  const h1 = h % 360;
  const h2 = (h * 7) % 360;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full ring-1 ring-black/10"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${h1} 70% 58%), hsl(${h2} 65% 46%))`,
      }}
    />
  );
}
