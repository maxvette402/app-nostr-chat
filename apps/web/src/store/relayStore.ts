import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RelayConfig, RelayStatus } from "@nostr-chat/core";
import { env } from "../env.ts";

interface RelayState {
  relays: RelayConfig[];
  statuses: Record<string, RelayStatus>;

  addRelay: (url: string, read?: boolean, write?: boolean) => void;
  removeRelay: (url: string) => void;
  toggleRead: (url: string) => void;
  toggleWrite: (url: string) => void;
  setStatus: (url: string, status: RelayStatus) => void;
}

const defaultRelays: RelayConfig[] = env.defaultRelays.map((url) => ({
  url,
  read: true,
  write: true,
}));

export const useRelayStore = create<RelayState>()(
  persist(
    (set) => ({
      relays: defaultRelays,
      statuses: {},

      addRelay: (url, read = true, write = true) => {
        const normalised = url.trim();
        if (!normalised.startsWith("wss://") && !normalised.startsWith("ws://")) {
          throw new Error("Relay URL must start with wss:// or ws://");
        }
        set((s) => {
          if (s.relays.some((r) => r.url === normalised)) return s;
          return { relays: [...s.relays, { url: normalised, read, write }] };
        });
      },

      removeRelay: (url) => {
        set((s) => ({ relays: s.relays.filter((r) => r.url !== url) }));
      },

      toggleRead: (url) => {
        set((s) => ({
          relays: s.relays.map((r) =>
            r.url === url ? { ...r, read: !r.read } : r
          ),
        }));
      },

      toggleWrite: (url) => {
        set((s) => ({
          relays: s.relays.map((r) =>
            r.url === url ? { ...r, write: !r.write } : r
          ),
        }));
      },

      setStatus: (url, status) => {
        set((s) => ({ statuses: { ...s.statuses, [url]: status } }));
      },
    }),
    { name: "nostr-relays" }
  )
);
