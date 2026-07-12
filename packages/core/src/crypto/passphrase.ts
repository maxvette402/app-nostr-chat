/**
 * Passphrase-based encryption for secrets kept in browser storage
 * (PBKDF2-SHA256 key derivation + AES-256-GCM via Web Crypto).
 */
import { bytesToHex, hexToBytes } from "./keys.js";

const PBKDF2_ITERATIONS = 300_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface EncryptedSecret {
  ciphertext: string; // hex
  salt: string; // hex
  iv: string; // hex
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWithPassphrase(
  plaintext: string,
  passphrase: string
): Promise<EncryptedSecret> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(ciphertextBuf)),
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
  };
}

/** Throws if the passphrase is incorrect (AES-GCM auth tag verification fails). */
export async function decryptWithPassphrase(
  secret: EncryptedSecret,
  passphrase: string
): Promise<string> {
  const salt = hexToBytes(secret.salt);
  const iv = hexToBytes(secret.iv);
  const key = await deriveKey(passphrase, salt);
  const ciphertext = hexToBytes(secret.ciphertext);

  const plaintextBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  return decoder.decode(plaintextBuf);
}
