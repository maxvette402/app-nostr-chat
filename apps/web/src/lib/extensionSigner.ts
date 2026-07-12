/**
 * Signer implementation backed by a NIP-07 browser extension. The extension
 * never exposes the private key — signing and NIP-44 encryption are
 * delegated to it entirely.
 */
import type { Signer } from "@nostr-chat/core";
import type { Event } from "nostr-tools";
import "./nostrWindow.ts";

export function createExtensionSigner(): Signer {
  if (!window.nostr) {
    throw new Error("NIP-07 extension not found. Install Alby or nos2x.");
  }
  const nostr = window.nostr;

  return {
    async getPublicKey() {
      return nostr.getPublicKey();
    },
    async signEvent(template) {
      const signed = await nostr.signEvent(template as unknown as Record<string, unknown>);
      return signed as unknown as Event;
    },
    async nip44Encrypt(peerPubkey, plaintext) {
      if (!nostr.nip44) {
        throw new Error("Your extension doesn't support NIP-44 encryption, which is required for private messaging.");
      }
      return nostr.nip44.encrypt(peerPubkey, plaintext);
    },
    async nip44Decrypt(peerPubkey, ciphertext) {
      if (!nostr.nip44) {
        throw new Error("Your extension doesn't support NIP-44 encryption, which is required for private messaging.");
      }
      return nostr.nip44.decrypt(peerPubkey, ciphertext);
    },
  };
}
