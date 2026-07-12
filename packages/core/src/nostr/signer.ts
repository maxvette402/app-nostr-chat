/**
 * Signer abstraction so the gift-wrap pipeline can be driven by either a raw
 * private key or a NIP-07 browser extension (which never exposes the key).
 */
import { getPublicKey } from "nostr-tools";
import type { Event, UnsignedEvent } from "nostr-tools";
import { getConversationKey, encryptNip44, decryptNip44 } from "../crypto/nip44.js";
import { createEvent } from "./events.js";

export interface Signer {
  getPublicKey(): Promise<string>;
  signEvent(template: Omit<UnsignedEvent, "pubkey">): Promise<Event>;
  nip44Encrypt(peerPubkey: string, plaintext: string): Promise<string>;
  nip44Decrypt(peerPubkey: string, ciphertext: string): Promise<string>;
}

/** Signer backed by a raw in-memory private key. */
export function createPrivateKeySigner(privateKey: Uint8Array): Signer {
  const publicKey = getPublicKey(privateKey);

  return {
    async getPublicKey() {
      return publicKey;
    },
    async signEvent(template) {
      return createEvent(template, privateKey);
    },
    async nip44Encrypt(peerPubkey, plaintext) {
      const key = getConversationKey(privateKey, peerPubkey);
      return encryptNip44(plaintext, key);
    },
    async nip44Decrypt(peerPubkey, ciphertext) {
      const key = getConversationKey(privateKey, peerPubkey);
      return decryptNip44(ciphertext, key);
    },
  };
}
