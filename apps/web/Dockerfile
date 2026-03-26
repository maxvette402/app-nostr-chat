# Build context is the monorepo root (set in docker-compose.yml)
# --- Build stage ---
FROM oven/bun:1.1.38-alpine AS builder

WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json turbo.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY packages/core/ ./packages/core/
COPY apps/web/ ./apps/web/

# Build-time env vars (baked into the Vite bundle)
ARG VITE_DEFAULT_RELAYS=wss://relay.damus.io,wss://relay.nostr.band,wss://nos.lol
ARG VITE_BLOSSOM_SERVER_URL=http://localhost:3001
ENV VITE_DEFAULT_RELAYS=$VITE_DEFAULT_RELAYS
ENV VITE_BLOSSOM_SERVER_URL=$VITE_BLOSSOM_SERVER_URL

# Build core first (web depends on it)
RUN cd packages/core && bun run build
RUN cd apps/web && bun run build

# --- Serve stage ---
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
