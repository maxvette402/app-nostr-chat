/**
 * NIP-44 encryption wrappers.
 * Uses nostr-tools/nip44 which implements XChaCha20-Poly1305 with ECDH shared secret.
 */
import { nip44 } from "nostr-tools";

export function getConversationKey(
  senderPrivkey: Uint8Array,
  recipientPubkey: string
): Uint8Array {
  return nip44.getConversationKey(senderPrivkey, recipientPubkey);
}

export function encryptNip44(
  plaintext: string,
  conversationKey: Uint8Array
): string {
  return nip44.encrypt(plaintext, conversationKey);
}

export function decryptNip44(
  ciphertext: string,
  conversationKey: Uint8Array
): string {
  return nip44.decrypt(ciphertext, conversationKey);
}
