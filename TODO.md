# TODO — Security review findings (2026-07-07)

Findings from a full review of the crypto core, web app, and self-hosted infra.
Ordered by severity. File references point at the code as of commit `205f9cc`.

**Status: all items below fixed and verified (2026-07-09).** See the note at the
bottom for how each was verified and what changed along the way.

## High

- [x] **Add authentication to the Blossom server** (`infra/blossom/server.js:52-116`)
  - `PUT /upload` and `DELETE /:sha256` accept requests from anyone. Implement
    BUD-01/02 authorization events (kind 24242) for upload and delete.
  - The client already has an `authHeader` param (`packages/core/src/blossom/client.ts:27`)
    but `apps/web/src/hooks/useNostr.ts:63` never passes one — wire it up.
  - Add a max upload size and stream to disk; the server currently buffers the
    entire request body in RAM (`server.js:53-55`), so one large PUT can OOM it.
  - `Access-Control-Allow-Origin: *` + open DELETE means any website can drive-by
    delete blobs on a locally running server. Auth fixes this; consider tightening
    CORS for DELETE regardless.

- [x] **Validate attachment URLs before fetching** (`apps/web/src/components/MessageBubble.tsx:14`)
  - `fileAttachment.blossomUrl` is attacker-controlled (comes from the decrypted
    message). Clicking download GETs an arbitrary URL → IP leak / tracking beacon /
    requests to internal hosts.
  - Pin the URL origin to the configured Blossom server (or a user-approved allowlist).
  - Add a `sha256` field to `FileAttachment` and verify the downloaded blob's hash
    before decrypting (matches the Blossom content-addressing model).

- [x] **Fix nginx `add_header` inheritance dropping security headers** (`apps/web/nginx.conf`)
  - Any `location` block with its own `add_header` inherits NONE from the server
    level. `location = /index.html` adds `Cache-Control`, so the HTML document is
    served with **no CSP, no X-Frame-Options, no nosniff**. Same for the JS/CSS
    static-assets block.
  - Repeat the security headers in each location block, or move them into a shared
    `include` file included everywhere.

- [x] **Stop storing the plaintext nsec in localStorage** (`apps/web/src/store/keyStore.ts:7`)
  - Any XSS = permanent, unrevokable identity theft (and the CSP that would blunt
    it isn't actually served — see nginx item above).
  - Encrypt the nsec at rest with a user passphrase (PBKDF2/Argon2 → AES-GCM via
    WebCrypto), or store it wrapped by a non-extractable CryptoKey in IndexedDB.
  - Tighten CSP `connect-src` from `ws: wss: http: https:` (allows exfil anywhere)
    to `wss:` + the configured Blossom origin.

## Medium

- [x] **Verify the seal signature in `unwrapGiftWrap`** (`packages/core/src/nostr/nip59.ts:61-82`)
  - NIP-59 requires checking the kind-13 seal's signature. The ECDH key derivation
    from `seal.pubkey` gives implicit authenticity, and the `rumor.pubkey` overwrite
    at line 81 blocks the classic impersonation bug, but the sig check is spec-mandated
    defense-in-depth (protects if a conversation key ever leaks).
  - `isValidEvent` already exists in `events.ts` — call it on the seal, reject on failure.

- [x] **Clamp incoming `rumor.created_at`** (`packages/core/src/nostr/nip17.ts:61`)
  - Senders can stamp messages arbitrarily far in the past/future to reorder
    conversation history or pin spam. Reject or floor timestamps more than a few
    minutes in the future; consider `receivedAt` as a sort tiebreaker.

- [x] **Make NIP-07 extension login actually work for messaging** (`apps/web/src/hooks/useNostr.ts:28,52`)
  - Both the inbox subscription and `sendMessage` require the raw `privateKey`,
    which extension login never has — extension users can neither send nor receive.
    This pushes users toward pasting their raw nsec (the less safe path).
  - NIP-07 exposes `nip44.encrypt/decrypt`; refactor `nip59.ts` to accept
    encrypt/decrypt callbacks instead of a raw key, then route through the extension.

- [x] **Fix hex login on the login page** (`apps/web/src/pages/LoginPage.tsx:107`)
  - UI promises "nsec1… or 64-char hex" but `handleNsec` only calls `loginWithNsec`,
    so hex input always errors. Detect hex and call `loginWithHex`.

- [x] **Gift-wrap sent messages to yourself** (`apps/web/src/hooks/useNostr.ts:74-88`)
  - NIP-17: publish a second wrap addressed to your own pubkey so other devices
    (e.g. the mobile app on the same identity) see sent messages. Currently sent
    messages exist only in local memory.

- [x] **Verify strfry.conf against the upstream schema** (`infra/strfry/strfry.conf`)
  - Upstream strfry nests `bind`/`port`/`info` inside a `relay { }` block;
    `websocket { hearbeatInterval }` (typo included) doesn't look like a real key.
    As written the relay may be running on pure defaults, ignoring the event-size
    and age limits. Diff against the upstream `strfry.conf` template.
  - No `writePolicy` — anyone can write. Fine on localhost, spam-magnet if exposed.

## Low / hardening

- [x] **Validate input in `hexToBytes` / `keyPairFromHex`** (`packages/core/src/crypto/keys.ts:5,31`)
  - Odd-length or non-hex input silently yields `NaN → 0` bytes, so a truncated key
    quietly builds a wrong keypair. Validate length + charset inside the core
    functions (the web app validates before calling, but the exports don't).

- [x] **Sanitize attacker-controlled `fileName` in downloads** (`apps/web/src/components/MessageBubble.tsx:25`)
  - A sender can name a file `invoice.pdf.html` or `.exe`. Sanitize and show the
    real extension prominently.

- [x] **Cap download size in `downloadDecryptedFile`** (`MessageBubble.tsx:14-20`)
  - The whole blob is buffered in memory; a URL pointing at a huge file hangs the tab.

- [x] **Make the Blossom server's public URL configurable** (`infra/blossom/server.js:63`)
  - Returns hardcoded `http://localhost:3001/...` — breaks (and downgrades to plain
    HTTP) on any real deployment. Derive from a configured public base URL env var.

- [x] **Use `crypto.getRandomValues` in `randomisedTimestamp`** (`packages/core/src/nostr/events.ts:32`)
  - `Math.random()` is acceptable for timestamp fuzzing, but a CSPRNG costs nothing.

- [x] **Update stale CLAUDE.md** — it still described committed duplicate `.js` files
  in `apps/web/src`, which were removed in PR #1.

## Reviewed and OK (no action)

Crypto core is sound: NIP-44 via nostr-tools, per-file random AES-256-GCM keys with
fresh IVs, ephemeral keys per gift wrap, randomized seal/wrap timestamps, the
`rumor.pubkey` overwrite in `unwrapGiftWrap`, and mobile's SecureStore with
`WHEN_UNLOCKED_THIS_DEVICE_ONLY`.

## Implementation notes (2026-07-09)

- **Signer abstraction**: `nip59.ts`/`nip17.ts` now take a `Signer`
  (`getPublicKey`/`signEvent`/`nip44Encrypt`/`nip44Decrypt`) instead of a raw
  private key. `createPrivateKeySigner` (core) and `createExtensionSigner` (web,
  `apps/web/src/lib/extensionSigner.ts`) both implement it — this is what made
  NIP-07 messaging and the self-echo gift wrap possible in the same pass.
  `buildDm`/`receiveDm`/`unwrapGiftWrap`/`createSeal` are now async as a result.
- **Self-wrap dedup**: `buildDm` now takes an array of participant pubkeys and
  returns `{ giftWraps, messageId }` — one rumor (and one stable id, via
  `getEventHash`) shared across every wrap, so the sender's own echoed copy
  dedupes against the locally-recorded sent message instead of appearing twice.
  `receiveDm` also had to stop hardcoding `recipientPubkey: myPubkey`, since that
  collapsed the self-echoed message onto the wrong conversation thread — it now
  recovers the real peer from the rumor's `p` tags when the message is our own.
- **Passphrase-encrypted nsec**: new `packages/core/src/crypto/passphrase.ts`
  (PBKDF2-SHA256, 300k iterations, AES-256-GCM). `keyStore.ts` now stores an
  encrypted blob instead of the raw nsec; a new `UnlockPage.tsx` handles the
  locked-session flow on reload.
  - **Note for future me**: this changed `loginWithNsec`/`loginWithHex` to
    require a passphrase argument and made them async — anything calling these
    directly (scripts, tests) needs updating.
- **Blossom auth**: `packages/core/src/blossom/auth.ts` builds a signed kind-24242
  header via a `Signer`; `infra/blossom/server.js` verifies it (sig, action tag,
  expiration, optional pubkey allowlist) before upload/delete, streams the body to
  disk with a size cap instead of buffering in RAM, and now needs a real
  `package.json` (it never had one — the old Dockerfile installed an npm package
  that the handwritten server.js didn't even use).
- **strfry.conf**: verified against the actual shipped default
  (`ghcr.io/dockur/strfry:latest`, strfry 1.1.0) by diffing
  `/etc/strfry.conf.default` from the image. Confirmed two real bugs, not just
  style: `bind`/`port` being outside `relay {}` meant the relay was listening on
  `127.0.0.1` only (unreachable via the docker-compose port mapping), and the
  image's *default* `writePolicy.plugin` points at an unconfigured stub
  (`/app/write-policy.py`, placeholder pubkeys only) — inheriting that by
  omission would have silently rejected every publish. Both are now explicit in
  the checked-in config and verified live (relay binds `0.0.0.0:7777`, a signed
  test event gets `["OK", ..., true, ""]`).
- **nginx CSP**: `nginx.conf` became `nginx.conf.template`, rendered at container
  start via nginx's built-in envsubst-on-templates entrypoint so `connect-src` can
  reference the real Blossom origin (`${BLOSSOM_ORIGIN}`) instead of a blanket
  `http: https:`. That entrypoint only substitutes names that exist as actual
  environment variables, so nginx's own `$uri`-style variables pass through
  untouched — verified by rendering and running the real built image.
- **Found and fixed along the way (not originally on this list, but blocking a full
  verification build)**: `packages/core/src/nostr/relay.ts` was calling
  `pool.subscribeMany`/`querySync` with a `Filter[]`, but the installed nostr-tools
  version (2.23.x, vs. the `^2.10.4` declared in package.json) takes a single
  `Filter` — this failed `tsc` and blocked `bun run build` entirely. Fixed by
  fanning out to one subscription/query per filter instead of silently dropping
  extras.
- **Known pre-existing gap, left alone**: `apps/web` has a `test` script but no
  test files, so `bun run test` fails there with "no test files found" — this
  predates all of the above (confirmed via `git stash`) and is unrelated to this
  pass; all real test coverage lives in `packages/core`.
