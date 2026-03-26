import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  keyPairFromNsec,
  keyPairFromHex,
  npubToHex,
  hexToNpub,
  isValidNpub,
  isValidNsec,
  isValidHexKey,
} from "./keys.js";

describe("generateKeyPair", () => {
  it("generates a valid keypair", () => {
    const kp = generateKeyPair();
    expect(kp.privateKey).toBeInstanceOf(Uint8Array);
    expect(kp.privateKey.length).toBe(32);
    expect(kp.publicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(kp.npub).toMatch(/^npub1/);
    expect(kp.nsec).toMatch(/^nsec1/);
  });

  it("generates unique keypairs", () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    expect(kp1.publicKey).not.toBe(kp2.publicKey);
  });
});

describe("keyPairFromNsec", () => {
  it("round-trips through nsec", () => {
    const original = generateKeyPair();
    const recovered = keyPairFromNsec(original.nsec);
    expect(recovered.publicKey).toBe(original.publicKey);
    expect(recovered.npub).toBe(original.npub);
  });

  it("throws on invalid nsec", () => {
    expect(() => keyPairFromNsec("invalid")).toThrow();
  });
});

describe("keyPairFromHex", () => {
  it("round-trips through hex", () => {
    const original = generateKeyPair();
    const hexPriv = Buffer.from(original.privateKey).toString("hex");
    const recovered = keyPairFromHex(hexPriv);
    expect(recovered.publicKey).toBe(original.publicKey);
  });
});

describe("npub / hex conversion", () => {
  it("converts hex pubkey to npub and back", () => {
    const kp = generateKeyPair();
    const npub = hexToNpub(kp.publicKey);
    expect(npub).toMatch(/^npub1/);
    expect(npubToHex(npub)).toBe(kp.publicKey);
  });
});

describe("validation", () => {
  it("validates npub", () => {
    const kp = generateKeyPair();
    expect(isValidNpub(kp.npub)).toBe(true);
    expect(isValidNpub("invalid")).toBe(false);
  });

  it("validates nsec", () => {
    const kp = generateKeyPair();
    expect(isValidNsec(kp.nsec)).toBe(true);
    expect(isValidNsec("invalid")).toBe(false);
  });

  it("validates hex key", () => {
    expect(isValidHexKey("a".repeat(64))).toBe(true);
    expect(isValidHexKey("abc")).toBe(false);
  });
});
