import { create } from "zustand";
import { persist } from "zustand/middleware";
import { npubToHex, hexToNpub, isValidNpub, isValidHexKey } from "@nostr-chat/core";
export const useContactStore = create()(persist((set, get) => ({
    contacts: [],
    addContact: (npubOrHex, displayName) => {
        let pubkey;
        let npub;
        if (isValidNpub(npubOrHex)) {
            pubkey = npubToHex(npubOrHex);
            npub = npubOrHex;
        }
        else if (isValidHexKey(npubOrHex)) {
            pubkey = npubOrHex;
            npub = hexToNpub(npubOrHex);
        }
        else {
            throw new Error("Invalid npub or hex public key");
        }
        const existing = get().contacts.find((c) => c.pubkey === pubkey);
        if (existing)
            return;
        const contact = {
            pubkey,
            npub,
            displayName,
            addedAt: Date.now(),
        };
        set((s) => ({ contacts: [...s.contacts, contact] }));
    },
    removeContact: (pubkey) => {
        set((s) => ({
            contacts: s.contacts.filter((c) => c.pubkey !== pubkey),
        }));
    },
    getContact: (pubkey) => {
        return get().contacts.find((c) => c.pubkey === pubkey);
    },
}), { name: "nostr-contacts" }));
