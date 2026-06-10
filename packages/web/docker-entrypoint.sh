#!/usr/bin/env bash
# Container start: apply schema, seed categories, then run the server.
set -e
cd /app

echo "→ Applying database schema (prisma db push)…"
npx prisma db push --schema=packages/web/prisma/schema.prisma --skip-generate

# One-time cache wipe after a contract redeploy. Set RESET_DB=true for one deploy,
# then remove it so future restarts don't wipe admin-created markets.
if [ "$RESET_DB" = "true" ]; then
  echo "→ RESET_DB=true — clearing cached markets & trades…"
  npx tsx packages/web/prisma/reset.ts || echo "  (reset non-fatal — continuing)"
fi

echo "→ Seeding categories + admin…"
npx tsx packages/web/prisma/seed.ts || echo "  (seed non-fatal — continuing)"

echo "→ Starting PredictX server…"
cd packages/web
exec npx tsx server.ts
