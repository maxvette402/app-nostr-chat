# Blossom server — HTTP blob storage for Nostr (BUD-01/02/03)
# Using satellite-cdn/blossom-server (Node.js reference implementation)
FROM oven/bun:1.1.38-alpine

WORKDIR /app

# Install blossom-server from npm
RUN bun add blossom-server@^0.2.0 || true

# Simple standalone blossom server entrypoint
COPY server.js ./

RUN mkdir -p /data/uploads

EXPOSE 3001

ENV PORT=3001
ENV UPLOAD_DIR=/data/uploads

CMD ["bun", "run", "server.js"]
