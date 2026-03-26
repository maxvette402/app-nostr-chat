NOSTR APP — Private File & Message Transfer

Context & Role
	•	App for sending private messages and files over Nostr protocol.
	•	End-to-end encrypted: only sender and receiver can read the content.
	•	Nostr is the transport layer: no central server, no account, no email.
	•	Identity = keypair (private + public key).
	•	Self-hosted; runs entirely in Docker (web version).
	•	Optional self-hosted Nostr relay included in docker-compose.

Nostr Protocol Knowledge
	•	Events: signed JSON objects.
	•	Fields: id, pubkey, created_at, kind, tags, content, sig.
	•	Relevant NIPs:
	•	NIP-01: core event structure and relay communication (WebSocket)
	•	NIP-04: encrypted DMs (deprecated)
	•	NIP-07: browser extension interface
	•	NIP-17: private direct messages (current best practice)
	•	NIP-19: bech32 identifiers
	•	NIP-44: versioned encryption standard
	•	NIP-59: Gift Wrap for sender/timestamp privacy
	•	NIP-65: relay list metadata
	•	NIP-96: HTTP file storage
	•	Blossom (BUD-01/02/03): alternative encrypted file storage
	•	Key management: private key (nsec) NEVER leaves client; public key (npub) derived from private key.
	•	Relays: WebSocket servers; connect to multiple for redundancy.
	•	Default public relays:
	•	wss://relay.damus.io
	•	wss://relay.nostr.band
	•	wss://nos.lol

App Architecture
	•	Runs on:
	•	Web SPA (React + Vite)
	•	Android + iOS (Expo)
	•	Monorepo:
	•	Shared core package: Nostr logic, crypto, models
	•	Web package: React + TypeScript + Vite
	•	Mobile package: Expo + TypeScript
	•	Backend: none required; optional self-hosted strfry relay.

Technology Stack
	•	Monorepo: Turborepo (lightweight, fast, Bun-compatible)
	•	Runtime: bun.sh
	•	Nostr library: nostr-tools (v1); consider NDK for v3
	•	Crypto: @noble/secp256k1 + @noble/ciphers
	•	Frontend: React + TypeScript + Vite + Tailwind CSS
	•	Mobile: Expo + React Native + NativeWind
	•	Local storage: IndexedDB (web), SQLite (mobile)
	•	Tests: Vitest (unit), Playwright (web E2E), Detox (mobile E2E)
	•	Self-hosted relay: strfry (C++)
	•	Self-hosted file storage: Blossom server

Key Management
	•	Web: prefer NIP-07 extension; fallback: manual nsec (memory only)
	•	Mobile: nsec entered manually, stored encrypted in SecureStore
	•	Private key NEVER logged, serialized, or sent over network

Use Cases
	•	Login: NIP-07 (web), manual/QR code (mobile); derive npub; show QR
	•	Logout: clear in-memory keys; wipe SecureStore optional
	•	Contacts: add via npub or NIP-05; resolve automatically; store locally or in NIP-65 relay list
	•	Send Private Message: NIP-17 + NIP-44 encryption; Gift Wrap (NIP-59); publish kind 1059
	•	Send File: encrypt locally (AES-256-GCM); upload to Blossom; share URL via NIP-17 DM
	•	Receive Messages/Files: subscribe to kind 1059 events; unwrap Gift Wrap; decrypt; notifications
	•	Conversation History: stored locally encrypted; decrypted on display
	•	Export Conversation: encrypted JSON or plain text (local only)
	•	Delete Conversation: local only; optional NIP-09 event (best effort)
	•	Relay Management: configure read/write relays (NIP-65); optional strfry; connection status

Encryption Details
	•	Messages: NIP-44 (XChaCha20-Poly1305, ECDH shared secret)
	•	Files: AES-256-GCM; per-transfer symmetric key; key shared in encrypted DM
	•	Storage: encrypted blobs in IndexedDB/SQLite; decrypted on display

Docker & Environment
	•	Required env vars:
	•	WEB_PORT (default 3000)
	•	DEFAULT_RELAYS (comma-separated WSS URLs)
	•	BLOSSOM_SERVER_URL (default http://localhost:3001)
	•	STRFRY_PORT (default 7777)
	•	NODE_ENV
	•	.env.example committed; .env files gitignored; validated at startup (Zod)

Quality Criteria
	•	All technologies open source
	•	Docker images pinned to specific versions
	•	Tests:
	•	Unit: NIP-44, Gift Wrap, key derivation, NIP-05, Blossom mock, storage
	•	Integration: publish/receive events on local strfry; file upload/download
	•	E2E: login, send text/file, verify conversation
	•	Tests run offline (local strfry + Blossom)
	•	Security: private key never exposed; file keys unique; Blossom URL authenticated; CSP headers
	•	Privacy: NIP-17 + NIP-59; encrypted files; optional Tor support (future)

Open Questions / Recommendations
	•	nostr-tools vs NDK: use nostr-tools for v1; consider NDK v3
	•	Blossom server: configurable per client; default = Docker-hosted
	•	NIP-46: defer to v3
	•	Monorepo: Turborepo preferred for v1; Nx optional if team scales
	•	Strfry relay: optional; include in Docker-compose for full stack
	•	Relay management: store last event IDs; exponential backoff
	•	Large files: support chunked upload
	•	Tor support: optional env variable for WebSocket proxy
	•	Prompt structure: split into context, architecture, flows, encryption, infra, tests, discussion points for maintainability

Proposed Project Structure

nostr-app/
├── docker-compose.yml
├── .env.example
├── turbo.json
├── package.json
├── packages/
│   └── core/
│       ├── src/
│       │   ├── crypto/
│       │   ├── nostr/
│       │   ├── blossom/
│       │   └── storage/
│       └── tests/
├── apps/
│   ├── web/
│   └── mobile/
└── infra/
    ├── strfry/
    └── blossom/