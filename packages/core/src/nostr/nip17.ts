/**
 * NIP-17: Private Direct Messages
 *
 * Uses NIP-59 Gift Wrap to send kind 14 DMs.
 * The rumor (kind 14) contains the plaintext message.
 * It is sealed (kind 13) and wrapped (kind 1059) before publishing.
 */
import { getEventHash } from "nostr-tools";
import type { Event, UnsignedEvent } from "nostr-tools";
import { giftWrapEvent, unwrapGiftWrap } from "./nip59.js";
import { nowSeconds } from "./events.js";
import type { Rumor } from "./nip59.js";
import type { Signer } from "./signer.js";
import type { FileAttachment, Message } from "../models/index.js";

export interface DmContent {
  text: string;
  fileAttachment?: FileAttachment;
}

/** Reject incoming messages timestamped further than this into the future. */
const MAX_FUTURE_SKEW_SECONDS = 5 * 60;

export interface BuiltDm {
  giftWraps: Event[];
  /** Stable id shared by every copy of this rumor, for local dedup. */
  messageId: string;
}

/**
 * Build and gift-wrap a NIP-17 DM rumor, once per participant (typically the
 * recipient plus the sender's own pubkey so other sessions/devices can see
 * sent messages). All copies share one rumor — and therefore one stable id —
 * so they dedupe correctly if a client ends up seeing more than one copy.
 */
export async function buildDm(
  content: DmContent,
  senderSigner: Signer,
  participantPubkeys: string[]
): Promise<BuiltDm> {
  const senderPubkey = await senderSigner.getPublicKey();
  const rumorBase: Omit<Rumor, "id"> = {
    kind: 14,
    pubkey: senderPubkey,
    created_at: nowSeconds(),
    tags: participantPubkeys.map((p) => ["p", p]),
    content: JSON.stringify(content),
  };
  const messageId = getEventHash(rumorBase as UnsignedEvent);
  const rumor: Rumor = { ...rumorBase, id: messageId };

  const giftWraps = await Promise.all(
    participantPubkeys.map((recipientPubkey) => giftWrapEvent(rumor, senderSigner, recipientPubkey))
  );

  return { giftWraps, messageId };
}

/** Decrypt and parse an incoming kind 1059 gift-wrapped DM. */
export async function receiveDm(
  giftWrap: Event,
  recipientSigner: Signer,
  myPubkey: string
): Promise<Message | null> {
  try {
    const rumor = await unwrapGiftWrap(giftWrap, recipientSigner);

    if (rumor.kind !== 14) {
      return null;
    }

    if (rumor.created_at > nowSeconds() + MAX_FUTURE_SKEW_SECONDS) {
      return null;
    }

    const dmContent: DmContent = JSON.parse(rumor.content);
    const senderPubkey = rumor.pubkey!;
    const isMine = senderPubkey === myPubkey;

    // When this is our own self-wrapped copy of a sent message, the rumor's
    // "p" tags carry both the real recipient and ourselves — recover the
    // actual conversation partner instead of collapsing onto our own pubkey.
    const pTags = rumor.tags.filter((t) => t[0] === "p").map((t) => t[1]);
    const recipientPubkey = isMine ? (pTags.find((p) => p !== myPubkey) ?? myPubkey) : myPubkey;

    return {
      id: rumor.id ?? giftWrap.id,
      senderPubkey,
      recipientPubkey,
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
