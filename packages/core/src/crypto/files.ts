/**
 * File encryption using AES-256-GCM via Web Crypto API.
 * Each file gets a unique random key and IV.
 */

export interface EncryptedFile {
  ciphertext: ArrayBuffer;
  key: string;   // hex-encoded
  iv: string;    // hex-encoded
  mimeType: string;
  fileName: string;
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export async function encryptFile(file: File): Promise<EncryptedFile> {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const fileBuffer = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    fileBuffer
  );

  return {
    ciphertext,
    key: bufToHex(rawKey.buffer),
    iv: bufToHex(iv.buffer),
    mimeType: file.type,
    fileName: file.name,
  };
}

export async function decryptFile(
  ciphertext: ArrayBuffer,
  keyHex: string,
  ivHex: string
): Promise<ArrayBuffer> {
  const rawKey = hexToBuf(keyHex);
  const iv = hexToBuf(ivHex);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, cryptoKey, ciphertext);
}
