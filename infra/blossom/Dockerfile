# Blossom server — self-contained HTTP blob storage for Nostr (BUD-01/02/03)
FROM oven/bun:1.1.38-alpine

WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY server.js ./

RUN mkdir -p /data/uploads

EXPOSE 3001

ENV PORT=3001
ENV UPLOAD_DIR=/data/uploads

CMD ["bun", "run", "server.js"]
