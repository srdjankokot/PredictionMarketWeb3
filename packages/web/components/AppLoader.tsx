'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CoinLoader } from '@/components/shared/CoinLoader';
import { useLoaderStore } from '@/store/loaderStore';

/** Full-screen blocking overlay shown during on-chain actions. */
export function AppLoader() {
  const active = useLoaderStore((s) => s.active);
  const message = useLoaderStore((s) => s.message);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--color-bg) 68%, transparent)',
            backdropFilter: 'blur(7px)',
            WebkitBackdropFilter: 'blur(7px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="flex flex-col items-center gap-5 rounded-2xl border bg-card px-12 py-9 shadow-glow"
          >
            <CoinLoader size={58} />
            <div className="text-center">
              <p className="text-sm font-semibold text-ink">{message}</p>
              <p className="mt-0.5 text-xs text-muted">Confirm in your wallet — don’t close this tab</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
