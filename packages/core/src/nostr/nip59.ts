/**
 * NIP-59: Gift Wrap
 *
 * Provides sender anonymity and timestamp obfuscation.
 *
 * Flow:
 *   rumor (kind N, unsigned)
 *     → seal (kind 13, signed by sender, content = NIP-44 encrypted rumor)
 *       → gift wrap (kind 1059, signed by ephemeral key, content = NIP-44 encrypted seal)
 */
import { getPublicKey } from "nostr-tools";
import type { Event, UnsignedEvent } from "nostr-tools";
import { getConversationKey, encryptNip44, decryptNip44 } from "../crypto/nip44.js";
import { createEvent, generateEphemeralKey, randomisedTimestamp } from "./events.js";

export type Rumor = Omit<UnsignedEvent, "sig"> & { id?: string };

/** Create a NIP-59 seal (kind 13) encrypting the rumor for the recipient. */
export function createSeal(
  rumor: Rumor,
  senderPrivkey: Uint8Array,
  recipientPubkey: string
): Event {
  const conversationKey = getConversationKey(senderPrivkey, recipientPubkey);
  const encryptedContent = encryptNip44(JSON.stringify(rumor), conversationKey);

  return createEvent(
    {
      kind: 13,
      content: encryptedContent,
      created_at: randomisedTimestamp(),
      tags: [],
    },
    senderPrivkey
  );
}

/** Create a NIP-59 gift wrap (kind 1059) encrypting the seal for the recipient. */
export function createGiftWrap(
  seal: Event,
  recipientPubkey: string
): { giftWrap: Event; ephemeralPrivkey: Uint8Array } {
  const ephemeralPrivkey = generateEphemeralKey();
  const conversationKey = getConversationKey(ephemeralPrivkey, recipientPubkey);
  const encryptedContent = encryptNip44(JSON.stringify(seal), conversationKey);

  const giftWrap = createEvent(
    {
      kind: 1059,
      content: encryptedContent,
      created_at: randomisedTimestamp(),
      tags: [["p", recipientPubkey]],
    },
    ephemeralPrivkey
  );

  return { giftWrap, ephemeralPrivkey };
}

/** Unwrap a gift wrap event and return the original rumor. */
export function unwrapGiftWrap(
  giftWrap: Event,
  recipientPrivkey: Uint8Array
): Rumor {
  // Step 1: decrypt gift wrap → seal
  const ephemeralPubkey = giftWrap.pubkey;
  const outerKey = getConversationKey(recipientPrivkey, ephemeralPubkey);
  const sealJson = decryptNip44(giftWrap.content, outerKey);
  const seal: Event = JSON.parse(sealJson);

  if (seal.kind !== 13) {
    throw new Error(`Expected seal kind 13, got ${seal.kind}`);
  }

  // Step 2: decrypt seal → rumor
  const sealerPubkey = seal.pubkey;
  const innerKey = getConversationKey(recipientPrivkey, sealerPubkey);
  const rumorJson = decryptNip44(seal.content, innerKey);
  const rumor: Rumor = JSON.parse(rumorJson);

  return { ...rumor, pubkey: sealerPubkey };
}

/** Full gift-wrap pipeline: rumor → seal → gift wrap. */
export function giftWrapEvent(
  rumor: Rumor,
  senderPrivkey: Uint8Array,
  recipientPubkey: string
): Event {
  const seal = createSeal(rumor, senderPrivkey, recipientPubkey);
  const { giftWrap } = createGiftWrap(seal, recipientPubkey);
  return giftWrap;
}
