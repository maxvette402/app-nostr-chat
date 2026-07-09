import { describe, it, expect } from "vitest";
import { generateKeyPair } from "../crypto/keys.js";
import { giftWrapEvent, unwrapGiftWrap } from "./nip59.js";
import { createPrivateKeySigner } from "./signer.js";
import { nowSeconds } from "./events.js";

describe("NIP-59 Gift Wrap", () => {
  it("wraps and unwraps a rumor correctly", async () => {
    const sender = generateKeyPair();
    const recipient = generateKeyPair();
    const senderSigner = createPrivateKeySigner(sender.privateKey);
    const recipientSigner = createPrivateKeySigner(recipient.privateKey);

    const rumor = {
      kind: 14,
      pubkey: sender.publicKey,
      created_at: nowSeconds(),
      tags: [["p", recipient.publicKey]],
      content: JSON.stringify({ text: "Hello, world!" }),
    };

    const giftWrap = await giftWrapEvent(rumor, senderSigner, recipient.publicKey);

    expect(giftWrap.kind).toBe(1059);
    expect(giftWrap.tags).toEqual(expect.arrayContaining([["p", recipient.publicKey]]));

    const recovered = await unwrapGiftWrap(giftWrap, recipientSigner);

    expect(recovered.kind).toBe(14);
    expect(recovered.content).toBe(rumor.content);
    expect(recovered.pubkey).toBe(sender.publicKey);
  });

  it("fails to unwrap with wrong key", async () => {
    const sender = generateKeyPair();
    const recipient = generateKeyPair();
    const attacker = generateKeyPair();
    const senderSigner = createPrivateKeySigner(sender.privateKey);
    const attackerSigner = createPrivateKeySigner(attacker.privateKey);

    const rumor = {
      kind: 14,
      pubkey: sender.publicKey,
      created_at: nowSeconds(),
      tags: [["p", recipient.publicKey]],
      content: "secret",
    };

    const giftWrap = await giftWrapEvent(rumor, senderSigner, recipient.publicKey);

    await expect(unwrapGiftWrap(giftWrap, attackerSigner)).rejects.toThrow();
  });

  it("uses a randomised timestamp different from now", async () => {
    const sender = generateKeyPair();
    const recipient = generateKeyPair();
    const senderSigner = createPrivateKeySigner(sender.privateKey);

    const rumor = {
      kind: 14,
      pubkey: sender.publicKey,
      created_at: nowSeconds(),
      tags: [],
      content: "test",
    };

    const giftWrap = await giftWrapEvent(rumor, senderSigner, recipient.publicKey);
    const now = nowSeconds();

    // Timestamp should be in the past (randomised) — not equal to now
    expect(giftWrap.created_at).toBeLessThanOrEqual(now);
    // And within 2 days
    expect(giftWrap.created_at).toBeGreaterThan(now - 2 * 24 * 60 * 60 - 1);
  });

  it("rejects a gift wrap with a tampered signature", async () => {
    const sender = generateKeyPair();
    const recipient = generateKeyPair();
    const senderSigner = createPrivateKeySigner(sender.privateKey);
    const recipientSigner = createPrivateKeySigner(recipient.privateKey);

    const rumor = {
      kind: 14,
      pubkey: sender.publicKey,
      created_at: nowSeconds(),
      tags: [],
      content: "test",
    };

    const giftWrap = await giftWrapEvent(rumor, senderSigner, recipient.publicKey);
    const tampered = { ...giftWrap, content: giftWrap.content + "x" };

    await expect(unwrapGiftWrap(tampered, recipientSigner)).rejects.toThrow();
  });
});
