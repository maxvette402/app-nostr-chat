# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Package manager:** Bun 1.1.38+. All scripts run through Turborepo at the root.

```bash
bun run dev        # Watch all packages and apps
bun run build      # Production build (respects Turborepo task deps)
bun run test       # Run all tests
bun run lint       # Lint all packages
bun run clean      # Remove dist/ and .turbo/ caches
```

**Package-scoped:**
```bash
bun run --cwd packages/core test:watch   # Run core unit tests in watch mode
bun run --cwd apps/web dev              # Vite dev server for web app
bun run --cwd apps/web preview          # Preview production build
bun run --cwd apps/mobile start         # Expo dev server (mobile)
bun run --cwd apps/mobile ios           # iOS simulator
bun run --cwd apps/mobile android       # Android emulator
```

**Run a single test file:**
```bash
bun run --cwd packages/core vitest run src/crypto/encrypt.test.ts
```

Vitest is configured with `globals: true` — no need to import `describe`, `it`, or `expect` in test files.

**Docker (self-hosted stack):**
```bash
docker compose up --build    # Build and start web + strfry relay + blossom file server
```

To transfer to another machine: `./export.sh` — creates a `.tar.gz`, then on the receiving end: `tar -xzf <file>.tar.gz && bun install && cp .env.example .env && docker compose up --build`.

Services after startup:
- Web app → http://localhost:3000
- Strfry relay → ws://localhost:7777
- Blossom file server → http://localhost:3001

## Architecture

This is a **Nostr-based end-to-end encrypted messaging app** — no accounts, no central server, identity is a secp256k1 keypair. A Turborepo + Bun workspace monorepo with three packages:

### `packages/core` — Shared crypto & protocol library

The foundation consumed by both web and mobile. Key modules:

- **`crypto/`** — Key generation (`generateKeyPair`), NIP-44 encryption (XChaCha20-Poly1305 via `@noble/ciphers`), file encryption (AES-256-GCM)
- **`nostr/`** — NIP implementations: NIP-17 (DM construction via `buildDm`/`receiveDm`), NIP-59 (Gift Wrap sealing), `RelayManager` (wrapper around `nostr-tools` `SimplePool`)
- **`blossom/`** — HTTP client for the Blossom file storage server
- **`models/`** — Zod-validated TypeScript interfaces (`Contact`, `Message`, `NostrEvent`, etc.)
- **`storage/`** — IndexedDB wrappers for message/contact persistence

Entry point: `packages/core/src/index.ts` → compiled to `packages/core/dist/index.js` (ESM).

Tests live in `packages/core/src/**/*.test.ts` (Vitest + happy-dom).

### `apps/web` — React SPA

Vite + React 18 + React Router v6. Path alias `@/` maps to `apps/web/src/`.

**State:** Four Zustand stores — `keyStore` (active keypair), `messageStore` (decrypted DMs), `contactStore`, `relayStore`. Stores persist to IndexedDB via the core library, except `messageStore` which is intentionally in-memory only.

**Key files:**
- `src/hooks/useNostr.ts` — bootstraps `RelayManager`, subscribes to kind-1059 (Gift Wrap) events, feeds decrypted messages into `messageStore`
- `src/env.ts` — Zod-validated runtime environment (falls back to localhost defaults)
- `src/pages/LoginPage.tsx` — NIP-07 extension OR manual nsec/hex import
- `src/pages/ChatPage.tsx` — conversation list + message view
- `src/components/` — `ConversationView`, `MessageBubble`, file upload UI

Production build → nginx Docker image (multi-stage Dockerfile in `apps/web/`).

**Duplicate files:** `apps/web/src/store/`, `src/components/`, and `src/pages/` each contain both `.ts`/`.tsx` and `.js` versions of every file — both are committed to git. The `.tsx`/`.ts` files are canonical; the `.js` files appear to be compiled output that was accidentally committed.

### `apps/mobile` — Expo / React Native

Expo Router (file-based routing under `apps/mobile/app/`). Shares the same Zustand store shape as web. Uses `expo-secure-store` instead of IndexedDB for private key storage. NativeWind provides Tailwind-compatible styling.

Path alias `@/` maps to `apps/mobile/` (the package root, not `src/`) — different from the web app.

### Message flow

```
Send:    keyStore → buildDm() → NIP-59 Gift Wrap → RelayManager.publish()
Receive: Relay sub (kind 1059) → RelayManager → receiveDm() → messageStore + IndexedDB
Files:   encryptFile() → Blossom HTTP upload → encrypted URL embedded in message
```

## NIPs implemented

NIP-01 (base), NIP-04 (legacy compat), NIP-07 (browser extension), NIP-17 (private DMs), NIP-44 (versioned encryption), NIP-59 (Gift Wrap).

## Security invariants

- `privateKey` (raw `Uint8Array`) in `keyStore` is **never** written to any storage — it lives only in Zustand memory for the session lifetime.
- For manual login, the nsec string is stored in `localStorage` so sessions survive page refresh, but the derived `privateKey` is only reconstructed in memory on load.
- For NIP-07 extension login, the app never touches the private key at all — all signing is delegated to `window.nostr.signEvent()`.

## Environment

Copy `.env.example` → `.env` before running. Vars split into two groups:

- **Docker-level** (no prefix): `WEB_PORT`, `STRFRY_PORT`, `NODE_ENV` — used by `docker-compose.yml` and nginx only.
- **Vite build-time** (`VITE_` prefix): `VITE_DEFAULT_RELAYS`, `VITE_BLOSSOM_SERVER_URL` — bundled into the browser app. Validated at startup via Zod in `apps/web/src/env.ts` with localhost fallbacks.
