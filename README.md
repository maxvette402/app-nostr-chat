# Nostr Chat

End-to-end encrypted private messaging and file transfer over the [Nostr](https://nostr.com) protocol.

- **No accounts** — your identity is a cryptographic keypair
- **No central server** — messages route through Nostr relays
- **End-to-end encrypted** — NIP-44 (XChaCha20-Poly1305) + NIP-59 Gift Wrap
- **File transfer** — AES-256-GCM encrypted blobs via a self-hosted Blossom server
- **Self-hostable** — Docker Compose brings up the full stack

## Architecture

```
nostr-chat/
├── packages/core/          # Shared: keys, NIP-44/59/17, relay, Blossom, storage
├── apps/web/               # React + Vite + Tailwind SPA
├── apps/mobile/            # Expo (React Native) app
└── infra/
    ├── strfry/             # Self-hosted Nostr relay (optional)
    └── blossom/            # Self-hosted file storage server
```

**Monorepo** managed by [Turborepo](https://turbo.build) and [Bun](https://bun.sh) workspaces.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Bun](https://bun.sh) | ≥ 1.1 | Runtime and package manager |
| [Node.js](https://nodejs.org) | ≥ 20 | Needed by some Expo tooling |
| [Docker](https://docker.com) | ≥ 24 | For the containerised stack |
| [Docker Compose](https://docs.docker.com/compose) | v2 | Bundled with Docker Desktop |

### NIP-07 browser extension (optional, recommended for web)

Install [Alby](https://getalby.com) or [nos2x](https://github.com/fiatjaf/nos2x) to use your existing Nostr identity in the browser without typing your private key.

---

## Setup

```bash
# 1. Clone
git clone https://github.com/maxvette402/app-nostr-chat.git
cd app-nostr-chat

# 2. Install dependencies (all packages)
bun install

# 3. Create environment file
cp .env.example .env
# Edit .env if needed (ports, relay URLs, Blossom URL)
```

---

## Development

> **How it works:** `bun run dev` launches a local [Vite](https://vite.dev) dev server directly on your machine — no Docker involved. Docker Compose is only used for the production-style stack (see [Run with Docker](#run-with-docker) below).

### Web app (hot-reload dev server)

```bash
# Build the shared core package once
bun run --cwd packages/core build

# Start the web dev server
bun run --cwd apps/web dev
# → http://localhost:5173
```

Or run everything via Turborepo (watches all packages):

```bash
bun run dev
# Turbo starts packages/core in watch mode + apps/web dev server simultaneously
```

### Mobile app (Expo)

```bash
bun run --cwd apps/mobile start
# Then press 'i' for iOS simulator, 'a' for Android emulator, or scan the QR code
```

---

## Build

### Web (production bundle)

```bash
bun run build
# Output: apps/web/dist/
```

### Preview the production build locally

```bash
bun run --cwd apps/web preview
# → http://localhost:4173
```

---

## Run with Docker

> **Note:** Docker is for production-style deployment. For local development, use the `bun run dev` workflow above — no Docker needed.

The Docker Compose stack starts:
1. **web** — nginx serving the production-built React SPA (port 3000)
2. **strfry** — self-hosted Nostr relay (port 7777)
3. **blossom** — self-hosted file storage server (port 3001)

```bash
# Build and start all services
docker compose up --build

# Access the app
open http://localhost:3000
```

The local relay is reachable at `ws://localhost:7777`. Add it in the app's relay settings.

### Run only the web app (use public relays)

```bash
docker compose up --build web
```

### Environment variables

Copy `.env.example` to `.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_PORT` | `3000` | Host port for the web app |
| `STRFRY_PORT` | `7777` | Host port for the strfry relay |
| `VITE_DEFAULT_RELAYS` | `wss://relay.damus.io,…` | Comma-separated relay URLs baked into the web build |
| `VITE_BLOSSOM_SERVER_URL` | `http://localhost:3001` | Blossom server URL baked into the web build |

> **Note:** `VITE_*` variables are embedded at Docker build time (Vite SPA). If you change them, rebuild with `docker compose up --build`.

---

## Tests

```bash
# Run all unit tests
bun run test

# Watch mode (core package)
bun run --cwd packages/core test:watch
```

Tests cover:
- Key generation and bech32 encoding (NIP-19)
- NIP-44 encryption round-trips
- NIP-59 Gift Wrap: wrap / unwrap, wrong-key rejection, timestamp randomisation
- NIP-17 DM: send / receive / wrong-key returns null

---

## Key Management

- **Web / Extension**: your private key stays in the NIP-07 extension — the app never sees it.
- **Web / Manual key**: held in memory (Zustand store) only — never written to `localStorage`, never logged.
- **Mobile**: stored encrypted in iOS Keychain / Android Keystore via `expo-secure-store` (flag `WHEN_UNLOCKED_THIS_DEVICE_ONLY`).

Your private key (nsec) is **never** sent to any server or relay.

---

## Project Structure

```
packages/core/src/
├── crypto/
│   ├── keys.ts        # Key generation, nsec/npub/hex conversion, validation
│   ├── nip44.ts       # NIP-44 XChaCha20-Poly1305 encryption wrappers
│   └── files.ts       # AES-256-GCM file encryption (Web Crypto API)
├── nostr/
│   ├── events.ts      # Event creation helpers, timestamp utilities
│   ├── nip59.ts       # Gift Wrap: rumor → seal (kind 13) → wrap (kind 1059)
│   ├── nip17.ts       # Private DMs via Gift Wrap (kind 14 rumor)
│   └── relay.ts       # RelayManager (SimplePool wrapper)
├── blossom/
│   └── client.ts      # Blossom HTTP client (BUD-01/02)
└── storage/
    └── idb.ts         # IndexedDB: messages, contacts, relay config
```

---

## Nostr NIPs Implemented

| NIP | Description | Status |
|-----|-------------|--------|
| NIP-01 | Core protocol, relay WebSocket | via nostr-tools |
| NIP-07 | Browser extension interface | Web login |
| NIP-17 | Private direct messages (kind 14) | Full |
| NIP-19 | bech32 identifiers (npub/nsec) | Full |
| NIP-44 | Versioned encryption (XChaCha20) | Full |
| NIP-59 | Gift Wrap (kind 1059) | Full |
| NIP-96 | HTTP file storage | via Blossom |

---

## Contributing

1. Fork and create a feature branch
2. `bun install`
3. `bun run test` — all tests must pass
4. Open a PR

---

## License

MIT
