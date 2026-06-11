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
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px color-mix(in srgb, var(--color-primary) 40%, transparent), 0 8px 30px -8px color-mix(in srgb, var(--color-primary) 45%, transparent)',
        card: '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.5)',
      },
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
