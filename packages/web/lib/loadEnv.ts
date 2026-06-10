// Loads .env / .env.local for the custom server (tsx doesn't auto-load env the
// way `next dev` does). This MUST be imported before any module that reads
// process.env at evaluation time (e.g. lib/constants). Uses Next's own loader so
// the same files are read here and by the Next runtime.
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
