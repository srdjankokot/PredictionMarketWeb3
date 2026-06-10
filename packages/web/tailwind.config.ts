import type { Config } from 'tailwindcss';

/**
 * Colors are driven by CSS variables injected at runtime from the tenant config
 * (white-label). Components must reference these tokens — never raw hex values.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        yes: 'var(--color-yes)',
        no: 'var(--color-no)',
        brand: 'var(--color-primary)',
        canvas: 'var(--color-bg)',
        surface: 'var(--color-bg-soft)',
        card: 'var(--color-card)',
        hairline: 'var(--color-border)',
        ink: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-once': {
          '0%': { backgroundColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)' },
          '100%': { backgroundColor: 'transparent' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'pulse-once': 'pulse-once 0.8s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
