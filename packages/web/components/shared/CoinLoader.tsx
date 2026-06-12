'use client';

import { motion } from 'framer-motion';

/**
 * Thematic flipping-coin loader: a coin spinning on its Y axis, green YES (✓)
 * on one face, red NO (✕) on the other, with a colored glow. Uses the tenant
 * yes/no CSS variables so it stays on-brand.
 */
export function CoinLoader({ size = 48 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, perspective: size * 4 }}>
      <motion.div
        style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d' }}
        animate={{ rotateY: 360 }}
        transition={{ duration: 1.15, repeat: Infinity, ease: 'linear' }}
      >
        <Face color="var(--color-yes)" label="✓" size={size} />
        <Face color="var(--color-no)" label="✕" size={size} back />
      </motion.div>
    </div>
  );
}

function Face({
  color,
  label,
  size,
  back,
}: {
  color: string;
  label: string;
  size: number;
  back?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '9999px',
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.42,
        color: '#04140a',
        background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${color} 88%, white) 0%, ${color} 72%)`,
        boxShadow: `0 0 26px -4px color-mix(in srgb, ${color} 65%, transparent), inset 0 0 0 2px color-mix(in srgb, ${color} 60%, white)`,
      }}
    >
      {label}
    </div>
  );
}
