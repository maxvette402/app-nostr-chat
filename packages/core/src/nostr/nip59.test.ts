import { describe, it, expect } from "vitest";
import { generateKeyPair } from "../crypto/keys.js";
import { giftWrapEvent, unwrapGiftWrap } from "./nip59.js";
import { nowSeconds } from "./events.js";

describe("NIP-59 Gift Wrap", () => {
  it("wraps and unwraps a rumor correctly", () => {
    const sender = generateKeyPair();
    const recipient = generateKeyPair();

    const rumor = {
      kind: 14,
      pubkey: sender.publicKey,
      created_at: nowSeconds(),
      tags: [["p", recipient.publicKey]],
      content: JSON.stringify({ text: "Hello, world!" }),
    };

    const giftWrap = giftWrapEvent(rumor, sender.privateKey, recipient.publicKey);

    expect(giftWrap.kind).toBe(1059);
    expect(giftWrap.tags).toEqual(expect.arrayContaining([["p", recipient.publicKey]]));

    const recovered = unwrapGiftWrap(giftWrap, recipient.privateKey);

    expect(recovered.kind).toBe(14);
    expect(recovered.content).toBe(rumor.content);
    expect(recovered.pubkey).toBe(sender.publicKey);
  });

  it("fails to unwrap with wrong key", () => {
    const sender = generateKeyPair();
    const recipient = generateKeyPair();
    const attacker = generateKeyPair();

    const rumor = {
      kind: 14,
      pubkey: sender.publicKey,
      created_at: nowSeconds(),
      tags: [["p", recipient.publicKey]],
      content: "secret",
    };

    const giftWrap = giftWrapEvent(rumor, sender.privateKey, recipient.publicKey);

    expect(() => unwrapGiftWrap(giftWrap, attacker.privateKey)).toThrow();
  });

  it("uses a randomised timestamp different from now", () => {
    const sender = generateKeyPair();
    const recipient = generateKeyPair();

    const rumor = {
      kind: 14,
      pubkey: sender.publicKey,
      created_at: nowSeconds(),
      tags: [],
      content: "test",
    };

    const giftWrap = giftWrapEvent(rumor, sender.privateKey, recipient.publicKey);
    const now = nowSeconds();

    // Timestamp should be in the past (randomised) — not equal to now
    expect(giftWrap.created_at).toBeLessThanOrEqual(now);
    // And within 2 days
    expect(giftWrap.created_at).toBeGreaterThan(now - 2 * 24 * 60 * 60 - 1);
  });
});
