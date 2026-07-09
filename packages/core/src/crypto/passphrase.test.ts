import { describe, it, expect } from "vitest";
import { encryptWithPassphrase, decryptWithPassphrase } from "./passphrase.js";

describe("passphrase encryption", () => {
  it("round-trips plaintext with the correct passphrase", async () => {
    const secret = await encryptWithPassphrase("nsec1supersecret", "correct horse battery staple");
    const recovered = await decryptWithPassphrase(secret, "correct horse battery staple");
    expect(recovered).toBe("nsec1supersecret");
  });

  it("produces different ciphertext/salt/iv each time", async () => {
    const a = await encryptWithPassphrase("same-plaintext", "pw");
    const b = await encryptWithPassphrase("same-plaintext", "pw");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  it("throws when given the wrong passphrase", async () => {
    const secret = await encryptWithPassphrase("nsec1supersecret", "correct-pw");
    await expect(decryptWithPassphrase(secret, "wrong-pw")).rejects.toThrow();
  });
});
