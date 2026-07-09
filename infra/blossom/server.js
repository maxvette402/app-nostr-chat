/**
 * Minimal Blossom-compatible blob storage server (BUD-01/02/03).
 * Stores blobs keyed by SHA-256 hash, returns public URL.
 *
 * Mutating endpoints (upload/delete) require a signed Nostr authorization
 * event (BUD-01 kind 24242) proving control of a key, scoped to the action
 * and (for delete) the target blob hash, with a short expiration window.
 * Reads stay unauthenticated, matching the "share via URL" CDN model.
 *
 * Endpoints:
 *   PUT  /upload          — upload a blob (auth required), returns JSON { url, sha256, size, type }
 *   GET  /:sha256         — retrieve a blob by hash
 *   HEAD /:sha256         — check blob existence
 *   DELETE /:sha256       — delete a blob (auth required)
 */
import { createServer } from "http";
import { createHash, randomUUID } from "crypto";
import { promises as fs, createWriteStream } from "fs";
import path from "path";
import { verifyEvent } from "nostr-tools/pure";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/data/uploads";
const PUBLIC_URL = (process.env.PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? String(25 * 1024 * 1024), 10);
const ALLOWED_PUBKEYS = process.env.ALLOWED_PUBKEYS
  ? new Set(process.env.ALLOWED_PUBKEYS.split(",").map((p) => p.trim()).filter(Boolean))
  : null;

// How far an auth event's created_at may drift from "now", in either direction.
const AUTH_CLOCK_SKEW_SECONDS = 60;

await fs.mkdir(UPLOAD_DIR, { recursive: true });

class AuthError extends Error {}

function blobPath(hash) {
  return path.join(UPLOAD_DIR, hash);
}

function tempPath() {
  return path.join(UPLOAD_DIR, `.tmp-${randomUUID()}`);
}

function parseAuthEvent(req) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Nostr ")) return null;
  try {
    const json = Buffer.from(header.slice(6).trim(), "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Verify a BUD-01 authorization event, scoped to `action` and (optionally) a blob hash. */
function verifyBlossomAuth(req, action, targetSha256) {
  const event = parseAuthEvent(req);
  if (!event) throw new AuthError("Missing or malformed Authorization header");
  if (event.kind !== 24242) throw new AuthError("Auth event must be kind 24242");
  if (!verifyEvent(event)) throw new AuthError("Invalid auth event signature");

  if (ALLOWED_PUBKEYS && !ALLOWED_PUBKEYS.has(event.pubkey)) {
    throw new AuthError("Pubkey is not authorized to use this server");
  }

  const now = Math.floor(Date.now() / 1000);
  if (event.created_at > now + AUTH_CLOCK_SKEW_SECONDS) {
    throw new AuthError("Auth event created_at is in the future");
  }

  const tags = Object.fromEntries(
    (event.tags ?? []).filter((t) => Array.isArray(t) && t.length >= 2).map((t) => [t[0], t[1]])
  );

  if (tags.t !== action) {
    throw new AuthError(`Auth event is not scoped for '${action}'`);
  }

  const expiration = parseInt(tags.expiration, 10);
  if (!Number.isFinite(expiration) || expiration < now) {
    throw new AuthError("Auth event is missing a valid, unexpired 'expiration' tag");
  }

  if (targetSha256 && tags.x && tags.x !== targetSha256) {
    throw new AuthError("Auth event hash tag does not match the target blob");
  }

  return { event, tags };
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function handleUpload(req, res) {
  let auth;
  try {
    auth = verifyBlossomAuth(req, "upload", undefined);
  } catch (err) {
    sendJson(res, 401, { error: err.message });
    return;
  }

  const tmpPath = tempPath();
  const writeStream = createWriteStream(tmpPath);
  const hasher = createHash("sha256");
  let total = 0;

  const cleanup = () => fs.unlink(tmpPath).catch(() => {});

  try {
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        writeStream.destroy();
        await cleanup();
        sendJson(res, 413, { error: `Upload exceeds max size of ${MAX_UPLOAD_BYTES} bytes` });
        req.destroy();
        return;
      }
      hasher.update(chunk);
      if (!writeStream.write(chunk)) {
        await new Promise((resolve) => writeStream.once("drain", resolve));
      }
    }
  } catch {
    writeStream.destroy();
    await cleanup();
    sendJson(res, 400, { error: "Upload stream failed" });
    return;
  }

  await new Promise((resolve, reject) => {
    writeStream.end();
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  const sha256 = hasher.digest("hex");

  if (auth.tags.x && auth.tags.x !== sha256) {
    await cleanup();
    sendJson(res, 400, { error: "Uploaded content hash does not match auth event" });
    return;
  }

  await fs.rename(tmpPath, blobPath(sha256));

  const mimeType = req.headers["content-type"] ?? "application/octet-stream";
  sendJson(res, 200, { url: `${PUBLIC_URL}/${sha256}`, sha256, size: total, type: mimeType });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && pathname === "/") {
    sendJson(res, 200, { ok: true, service: "blossom-server" });
    return;
  }

  // Upload
  if (req.method === "PUT" && pathname === "/upload") {
    await handleUpload(req, res);
    return;
  }

  // Download / delete
  const hashMatch = pathname.match(/^\/([0-9a-f]{64})$/);
  if (hashMatch) {
    const hash = hashMatch[1];
    const filePath = blobPath(hash);

    if (req.method === "HEAD") {
      try {
        const stat = await fs.stat(filePath);
        res.writeHead(200, { "Content-Length": stat.size });
        res.end();
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }

    if (req.method === "GET") {
      try {
        const data = await fs.readFile(filePath);
        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Length": data.length,
        });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
      return;
    }

    if (req.method === "DELETE") {
      try {
        verifyBlossomAuth(req, "delete", hash);
      } catch (err) {
        sendJson(res, 401, { error: err.message });
        return;
      }
      try {
        await fs.unlink(filePath);
        res.writeHead(200);
        res.end();
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }
  }

  sendJson(res, 404, { error: "Not found" });
}).listen(PORT, () => {
  console.log(`Blossom server running on port ${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
  console.log(`Public URL base: ${PUBLIC_URL}`);
  console.log(`Max upload size: ${MAX_UPLOAD_BYTES} bytes`);
});
