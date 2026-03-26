import { finalizeEvent, verifyEvent, generateSecretKey } from "nostr-tools";
import type { Event, UnsignedEvent } from "nostr-tools";

export type NostrEvent = Event;
export type NostrUnsignedEvent = UnsignedEvent;

/** Create and sign an event with a given private key. */
export function createEvent(
  template: Omit<UnsignedEvent, "pubkey">,
  privateKey: Uint8Array
): NostrEvent {
  return finalizeEvent(template, privateKey);
}

/** Verify an event's signature. */
export function isValidEvent(event: NostrEvent): boolean {
  return verifyEvent(event);
}

/** Generate a one-time ephemeral keypair (for gift wrapping). */
export function generateEphemeralKey(): Uint8Array {
  return generateSecretKey();
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Randomise timestamp within ±2 days to improve privacy (NIP-59). */
export function randomisedTimestamp(): number {
  const twoDays = 2 * 24 * 60 * 60;
  return nowSeconds() - Math.floor(Math.random() * twoDays);
}
