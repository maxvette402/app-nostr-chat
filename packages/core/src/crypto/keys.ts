import { generateSecretKey, getPublicKey } from "nostr-tools";
import { nip19 } from "nostr-tools";
const bytesToHex = (b: Uint8Array): string =>
  Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
};

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: string;   // hex
  npub: string;        // bech32
  nsec: string;        // bech32
}

export function generateKeyPair(): KeyPair {
  const privateKey = generateSecretKey();
  return buildKeyPair(privateKey);
}

export function keyPairFromNsec(nsec: string): KeyPair {
  const decoded = nip19.decode(nsec);
  if (decoded.type !== "nsec") {
    throw new Error("Invalid nsec string");
  }
  return buildKeyPair(decoded.data as Uint8Array);
}

export function keyPairFromHex(hexPrivKey: string): KeyPair {
  const privateKey = hexToBytes(hexPrivKey);
  return buildKeyPair(privateKey);
}

function buildKeyPair(privateKey: Uint8Array): KeyPair {
  const publicKey = getPublicKey(privateKey);
  const npub = nip19.npubEncode(publicKey);
  const nsec = nip19.nsecEncode(privateKey);
  return { privateKey, publicKey, npub, nsec };
}

export function npubToHex(npub: string): string {
  const decoded = nip19.decode(npub);
  if (decoded.type !== "npub") {
    throw new Error("Invalid npub string");
  }
  return decoded.data as string;
}

export function hexToNpub(hex: string): string {
  return nip19.npubEncode(hex);
}

export function isValidNpub(npub: string): boolean {
  try {
    const decoded = nip19.decode(npub);
    return decoded.type === "npub";
  } catch {
    return false;
  }
}

export function isValidNsec(nsec: string): boolean {
  try {
    const decoded = nip19.decode(nsec);
    return decoded.type === "nsec";
  } catch {
    return false;
  }
}

export function isValidHexKey(hex: string): boolean {
  return /^[0-9a-f]{64}$/.test(hex);
}

export { bytesToHex, hexToBytes };
