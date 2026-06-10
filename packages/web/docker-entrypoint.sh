#!/usr/bin/env bash
# Container start: apply schema, seed categories, then run the server.
set -e
cd /app

echo "→ Applying database schema (prisma db push)…"
npx prisma db push --schema=packages/web/prisma/schema.prisma --skip-generate

echo "→ Seeding categories + admin…"
npx tsx packages/web/prisma/seed.ts || echo "  (seed non-fatal — continuing)"

echo "→ Starting PredictX server…"
cd packages/web
exec npx tsx server.ts
