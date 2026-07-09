import { create } from "zustand";
import {
  keyPairFromNsec,
  keyPairFromHex,
  isValidNsec,
  isValidHexKey,
  hexToNpub,
  encryptWithPassphrase,
  decryptWithPassphrase,
  createPrivateKeySigner,
} from "@nostr-chat/core";
import type { EncryptedSecret, Signer } from "@nostr-chat/core";
import { createExtensionSigner } from "../lib/extensionSigner.ts";
import "../lib/nostrWindow.ts";

const SESSION_KEY = "nostr-session";

interface PersistedSession {
  signerType: "manual";
  encryptedNsec: EncryptedSecret;
}

function persistSession(data: PersistedSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
function clearPersistedSession() {
  localStorage.removeItem(SESSION_KEY);
}
function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

type SignerType = "extension" | "manual";

interface KeyState {
  /** Private key — NEVER persisted to storage. */
  privateKey: Uint8Array | null;
  publicKey: string | null; // hex
  npub: string | null; // bech32
  signerType: SignerType | null;
  isLoggedIn: boolean;
  /** True if an encrypted session exists in localStorage but hasn't been unlocked yet. */
  hasLockedSession: boolean;

  loginWithExtension: () => Promise<void>;
  loginWithNsec: (nsec: string, passphrase: string) => Promise<void>;
  loginWithHex: (hex: string, passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  logout: () => void;
  getSigner: () => Signer;
  signEvent: (event: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

async function loginManual(
  set: (partial: Partial<KeyState>) => void,
  kp: { privateKey: Uint8Array; publicKey: string; npub: string; nsec: string },
  passphrase: string
) {
  const encryptedNsec = await encryptWithPassphrase(kp.nsec, passphrase);
  persistSession({ signerType: "manual", encryptedNsec });
  set({
    privateKey: kp.privateKey,
    publicKey: kp.publicKey,
    npub: kp.npub,
    signerType: "manual",
    isLoggedIn: true,
    hasLockedSession: false,
  });
}

export const useKeyStore = create<KeyState>()((set, get) => ({
  privateKey: null,
  publicKey: null,
  npub: null,
  signerType: null,
  isLoggedIn: false,
  hasLockedSession: loadPersistedSession() !== null,

  loginWithExtension: async () => {
    if (!window.nostr) {
      throw new Error("NIP-07 extension not found. Install Alby or nos2x.");
    }
    const pubkeyHex = await window.nostr.getPublicKey();
    const npub = hexToNpub(pubkeyHex);
    set({
      privateKey: null,
      publicKey: pubkeyHex,
      npub,
      signerType: "extension",
      isLoggedIn: true,
      hasLockedSession: false,
    });
  },

  loginWithNsec: async (nsec: string, passphrase: string) => {
    if (!isValidNsec(nsec)) {
      throw new Error("Invalid nsec key");
    }
    if (!passphrase) {
      throw new Error("A passphrase is required to protect your key at rest");
    }
    const kp = keyPairFromNsec(nsec);
    await loginManual(set, kp, passphrase);
  },

  loginWithHex: async (hex: string, passphrase: string) => {
    if (!isValidHexKey(hex)) {
      throw new Error("Invalid hex private key (must be 64 hex characters)");
    }
    if (!passphrase) {
      throw new Error("A passphrase is required to protect your key at rest");
    }
    const kp = keyPairFromHex(hex);
    await loginManual(set, kp, passphrase);
  },

  unlock: async (passphrase: string) => {
    const session = loadPersistedSession();
    if (!session) {
      throw new Error("No saved session found");
    }
    let nsec: string;
    try {
      nsec = await decryptWithPassphrase(session.encryptedNsec, passphrase);
    } catch {
      throw new Error("Incorrect passphrase");
    }
    if (!isValidNsec(nsec)) {
      throw new Error("Saved session is corrupted");
    }
    const kp = keyPairFromNsec(nsec);
    set({
      privateKey: kp.privateKey,
      publicKey: kp.publicKey,
      npub: kp.npub,
      signerType: "manual",
      isLoggedIn: true,
      hasLockedSession: false,
    });
  },

  logout: () => {
    clearPersistedSession();
    set({
      privateKey: null,
      publicKey: null,
      npub: null,
      signerType: null,
      isLoggedIn: false,
      hasLockedSession: false,
    });
  },

  getSigner: () => {
    const { signerType, privateKey } = get();
    if (signerType === "extension") {
      return createExtensionSigner();
    }
    if (signerType === "manual" && privateKey) {
      return createPrivateKeySigner(privateKey);
    }
    throw new Error("Not logged in");
  },

  signEvent: async (event) => {
    const { signerType, privateKey } = get();
    if (signerType === "extension") {
      if (!window.nostr) throw new Error("Extension not available");
      return window.nostr.signEvent(event);
    }
    if (signerType === "manual" && privateKey) {
      const { finalizeEvent } = await import("nostr-tools");
      return finalizeEvent(event as Parameters<typeof finalizeEvent>[0], privateKey) as unknown as Record<string, unknown>;
    }
    throw new Error("Not logged in");
  },
}));
