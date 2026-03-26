import { create } from "zustand";
import { keyPairFromNsec, keyPairFromHex, isValidNsec, isValidHexKey, hexToNpub } from "@nostr-chat/core";

type SignerType = "extension" | "manual";

interface KeyState {
  /** Private key — NEVER persisted to storage. */
  privateKey: Uint8Array | null;
  publicKey: string | null;    // hex
  npub: string | null;         // bech32
  signerType: SignerType | null;
  isLoggedIn: boolean;

  loginWithExtension: () => Promise<void>;
  loginWithNsec: (nsec: string) => void;
  loginWithHex: (hex: string) => void;
  logout: () => void;
  signEvent: (event: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: Record<string, unknown>): Promise<Record<string, unknown>>;
    };
  }
}

export const useKeyStore = create<KeyState>()((set, get) => ({
  privateKey: null,
  publicKey: null,
  npub: null,
  signerType: null,
  isLoggedIn: false,

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
    });
  },

  loginWithNsec: (nsec: string) => {
    if (!isValidNsec(nsec)) {
      throw new Error("Invalid nsec key");
    }
    const kp = keyPairFromNsec(nsec);
    set({
      privateKey: kp.privateKey,
      publicKey: kp.publicKey,
      npub: kp.npub,
      signerType: "manual",
      isLoggedIn: true,
    });
  },

  loginWithHex: (hex: string) => {
    if (!isValidHexKey(hex)) {
      throw new Error("Invalid hex private key (must be 64 hex characters)");
    }
    const kp = keyPairFromHex(hex);
    set({
      privateKey: kp.privateKey,
      publicKey: kp.publicKey,
      npub: kp.npub,
      signerType: "manual",
      isLoggedIn: true,
    });
  },

  logout: () => {
    set({
      privateKey: null,
      publicKey: null,
      npub: null,
      signerType: null,
      isLoggedIn: false,
    });
  },

  signEvent: async (event) => {
    const { signerType, privateKey } = get();
    if (signerType === "extension") {
      if (!window.nostr) throw new Error("Extension not available");
      return window.nostr.signEvent(event);
    }
    if (signerType === "manual" && privateKey) {
      const { finalizeEvent } = await import("nostr-tools");
      return finalizeEvent(event as Parameters<typeof finalizeEvent>[0], privateKey) as Record<string, unknown>;
    }
    throw new Error("Not logged in");
  },
}));
