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
import type { Event, UnsignedEvent } from "nostr-tools";
import { getConversationKey, encryptNip44 } from "../crypto/nip44.js";
import { createEvent, generateEphemeralKey, isValidEvent, randomisedTimestamp } from "./events.js";
import type { Signer } from "./signer.js";

export type Rumor = Omit<UnsignedEvent, "sig"> & { id?: string };

/** Create a NIP-59 seal (kind 13) encrypting the rumor for the recipient. */
export async function createSeal(
  rumor: Rumor,
  senderSigner: Signer,
  recipientPubkey: string
): Promise<Event> {
  const encryptedContent = await senderSigner.nip44Encrypt(recipientPubkey, JSON.stringify(rumor));

  return senderSigner.signEvent({
    kind: 13,
    content: encryptedContent,
    created_at: randomisedTimestamp(),
    tags: [],
  });
}

/** Create a NIP-59 gift wrap (kind 1059) encrypting the seal for the recipient. */
export function createGiftWrap(
  seal: Event,
  recipientPubkey: string
): { giftWrap: Event; ephemeralPrivkey: Uint8Array } {
  // The ephemeral key is generated and used entirely locally — it never
  // touches the sender's real identity, so no signer is needed here.
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
export async function unwrapGiftWrap(
  giftWrap: Event,
  recipientSigner: Signer
): Promise<Rumor> {
  if (!isValidEvent(giftWrap)) {
    throw new Error("Invalid gift wrap signature");
  }

  // Step 1: decrypt gift wrap → seal
  const ephemeralPubkey = giftWrap.pubkey;
  const sealJson = await recipientSigner.nip44Decrypt(ephemeralPubkey, giftWrap.content);
  const seal: Event = JSON.parse(sealJson);

  if (seal.kind !== 13) {
    throw new Error(`Expected seal kind 13, got ${seal.kind}`);
  }
  if (!isValidEvent(seal)) {
    throw new Error("Invalid seal signature");
  }

  // Step 2: decrypt seal → rumor
  const sealerPubkey = seal.pubkey;
  const rumorJson = await recipientSigner.nip44Decrypt(sealerPubkey, seal.content);
  const rumor: Rumor = JSON.parse(rumorJson);

  return { ...rumor, pubkey: sealerPubkey };
}

/** Full gift-wrap pipeline: rumor → seal → gift wrap. */
export async function giftWrapEvent(
  rumor: Rumor,
  senderSigner: Signer,
  recipientPubkey: string
): Promise<Event> {
  const seal = await createSeal(rumor, senderSigner, recipientPubkey);
  const { giftWrap } = createGiftWrap(seal, recipientPubkey);
  return giftWrap;
}
