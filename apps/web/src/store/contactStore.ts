import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Contact } from "@nostr-chat/core";
import { npubToHex, hexToNpub, isValidNpub, isValidHexKey } from "@nostr-chat/core";

interface ContactState {
  contacts: Contact[];
  addContact: (npubOrHex: string, displayName?: string) => void;
  removeContact: (pubkey: string) => void;
  getContact: (pubkey: string) => Contact | undefined;
}

export const useContactStore = create<ContactState>()(
  persist(
    (set, get) => ({
      contacts: [],

      addContact: (npubOrHex: string, displayName?: string) => {
        let pubkey: string;
        let npub: string;

        if (isValidNpub(npubOrHex)) {
          pubkey = npubToHex(npubOrHex);
          npub = npubOrHex;
        } else if (isValidHexKey(npubOrHex)) {
          pubkey = npubOrHex;
          npub = hexToNpub(npubOrHex);
        } else {
          throw new Error("Invalid npub or hex public key");
        }

        const existing = get().contacts.find((c) => c.pubkey === pubkey);
        if (existing) return;

        const contact: Contact = {
          pubkey,
          npub,
          displayName,
          addedAt: Date.now(),
        };

        set((s) => ({ contacts: [...s.contacts, contact] }));
      },

      removeContact: (pubkey: string) => {
        set((s) => ({
          contacts: s.contacts.filter((c) => c.pubkey !== pubkey),
        }));
      },

      getContact: (pubkey: string) => {
        return get().contacts.find((c) => c.pubkey === pubkey);
      },
    }),
    { name: "nostr-contacts" }
  )
);
