/**
 * Minimal Blossom-compatible blob storage server (BUD-01/02).
 * Stores blobs keyed by SHA-256 hash, returns public URL.
 *
 * Endpoints:
 *   PUT  /upload          — upload a blob, returns JSON { url, sha256, size, type }
 *   GET  /:sha256         — retrieve a blob by hash
 *   HEAD /:sha256         — check blob existence
 *   DELETE /:sha256       — delete a blob
 */
import { createServer } from "http";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/data/uploads";

await fs.mkdir(UPLOAD_DIR, { recursive: true });

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function blobPath(hash) {
  return path.join(UPLOAD_DIR, hash);
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
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "blossom-server" }));
    return;
  }

  // Upload
  if (req.method === "PUT" && pathname === "/upload") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const hash = sha256Hex(body);
    const filePath = blobPath(hash);

    await fs.writeFile(filePath, body);

    const mimeType = req.headers["content-type"] ?? "application/octet-stream";
    const result = {
      url: `http://localhost:${PORT}/${hash}`,
      sha256: hash,
      size: body.length,
      type: mimeType,
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // Download
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

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}).listen(PORT, () => {
  console.log(`Blossom server running on port ${PORT}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
});
