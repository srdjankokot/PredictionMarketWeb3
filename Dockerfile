# PredictX — single image: Next.js + Socket.io + cron + on-chain event listener.
# The same image runs on a free container host now and on any VPS later.
FROM node:22-bookworm-slim AS app
WORKDIR /app

# 1) Install all workspace deps (dev deps are needed to build).
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/web/package.json ./packages/web/
RUN npm ci

# 2) Copy the source.
COPY . .

# 3) Public config is inlined into the client bundle at BUILD time, so the
#    contract addresses must be passed as build args (the host injects them).
ARG NEXT_PUBLIC_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_USDC_ADDRESS
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_ADMIN_ADDRESS
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_CONTRACT_ADDRESS=$NEXT_PUBLIC_CONTRACT_ADDRESS \
    NEXT_PUBLIC_USDC_ADDRESS=$NEXT_PUBLIC_USDC_ADDRESS \
    NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID \
    NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_ADMIN_ADDRESS=$NEXT_PUBLIC_ADMIN_ADDRESS \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

# 4) Compile contracts (ABIs) -> generate Prisma client -> build Next.
RUN npm run compile \
 && npm run db:generate --workspace packages/web \
 && npm run build --workspace packages/web

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Applies the schema, seeds categories, then starts the server.
CMD ["bash", "packages/web/docker-entrypoint.sh"]
