'use client';

import { motion } from 'framer-motion';

/**
 * Thematic flipping-coin loader: a coin spinning on its Y axis with an Ethereum
 * diamond on each face, green YES on one side, red NO on the other, with a
 * colored glow. Uses the tenant yes/no CSS variables so it stays on-brand.
 */
export function CoinLoader({ size = 48 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, perspective: size * 4 }}>
      <motion.div
        style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d' }}
        animate={{ rotateY: 360 }}
        transition={{ duration: 1.15, repeat: Infinity, ease: 'linear' }}
      >
        <Face color="var(--color-yes)" size={size} />
        <Face color="var(--color-no)" size={size} back />
      </motion.div>
    </div>
  );
}

function Face({ color, size, back }: { color: string; size: number; back?: boolean }) {
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
        color: 'rgba(255,255,255,.92)',
        background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${color} 88%, white) 0%, ${color} 72%)`,
        boxShadow: `0 0 26px -4px color-mix(in srgb, ${color} 65%, transparent), inset 0 0 0 2px color-mix(in srgb, ${color} 55%, white)`,
      }}
    >
      <EthMark size={size} />
    </div>
  );
}

/** Minimal Ethereum diamond glyph. */
function EthMark({ size }: { size: number }) {
  const s = size * 0.5;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.25))' }}
    >
      <path d="M12 2 L19 12 L12 16 L5 12 Z" opacity="0.95" />
      <path d="M12 17.2 L19 13 L12 22 L5 13 Z" opacity="0.65" />
    </svg>
  );
}
