/**
 * BUD-01/02 authorization events (kind 24242) for the Blossom server.
 * The signed event proves the caller controls a Nostr key and scopes the
 * action (upload/delete) and blob hash, with a short expiration window.
 */
import type { Signer } from "../nostr/signer.js";

export type BlossomAction = "upload" | "delete" | "get" | "list";

const AUTH_EVENT_TTL_SECONDS = 5 * 60;

function toBase64(json: string): string {
  return btoa(unescape(encodeURIComponent(json)));
}

/** Build a signed `Authorization: Nostr <base64>` header value for a Blossom request. */
export async function createBlossomAuthHeader(
  action: BlossomAction,
  sha256: string | undefined,
  signer: Signer
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const tags: string[][] = [
    ["t", action],
    ["expiration", String(now + AUTH_EVENT_TTL_SECONDS)],
  ];
  if (sha256) tags.push(["x", sha256]);

  const signed = await signer.signEvent({
    kind: 24242,
    created_at: now,
    tags,
    content: `${action} blob`,
  });

  return `Nostr ${toBase64(JSON.stringify(signed))}`;
}
