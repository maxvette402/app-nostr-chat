/**
 * NIP-17: Private Direct Messages
 *
 * Uses NIP-59 Gift Wrap to send kind 14 DMs.
 * The rumor (kind 14) contains the plaintext message.
 * It is sealed (kind 13) and wrapped (kind 1059) before publishing.
 */
import { getPublicKey } from "nostr-tools";
import type { Event } from "nostr-tools";
import { giftWrapEvent, unwrapGiftWrap } from "./nip59.js";
import { nowSeconds } from "./events.js";
import type { Rumor } from "./nip59.js";
import type { FileAttachment, Message } from "../models/index.js";

export interface DmContent {
  text: string;
  fileAttachment?: FileAttachment;
}

/** Build and gift-wrap a NIP-17 DM rumor for a single recipient. */
export function buildDm(
  content: DmContent,
  senderPrivkey: Uint8Array,
  recipientPubkey: string
): Event {
  const senderPubkey = getPublicKey(senderPrivkey);
  const rumor: Rumor = {
    kind: 14,
    pubkey: senderPubkey,
    created_at: nowSeconds(),
    tags: [["p", recipientPubkey]],
    content: JSON.stringify(content),
  };

  return giftWrapEvent(rumor, senderPrivkey, recipientPubkey);
}

/** Decrypt and parse an incoming kind 1059 gift-wrapped DM. */
export function receiveDm(
  giftWrap: Event,
  recipientPrivkey: Uint8Array,
  myPubkey: string
): Message | null {
  try {
    const rumor = unwrapGiftWrap(giftWrap, recipientPrivkey);

    if (rumor.kind !== 14) {
      return null;
    }

    const dmContent: DmContent = JSON.parse(rumor.content);
    const senderPubkey = rumor.pubkey!;
    const isMine = senderPubkey === myPubkey;

    return {
      id: giftWrap.id,
      senderPubkey,
      recipientPubkey: myPubkey,
      content: dmContent.text,
      fileAttachment: dmContent.fileAttachment,
      createdAt: rumor.created_at,
      receivedAt: Math.floor(Date.now() / 1000),
      direction: isMine ? "sent" : "received",
    };
  } catch {
    return null;
  }
}
