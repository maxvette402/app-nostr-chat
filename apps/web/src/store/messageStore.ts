import { create } from "zustand";
import type { Message } from "@nostr-chat/core";

interface MessageState {
  /** Messages keyed by peer pubkey (hex). */
  conversations: Record<string, Message[]>;
  activeConversation: string | null;

  addMessage: (peerPubkey: string, message: Message) => void;
  setActiveConversation: (pubkey: string | null) => void;
  getMessages: (peerPubkey: string) => Message[];
  deleteConversation: (peerPubkey: string) => void;
  hasMessage: (id: string) => boolean;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  conversations: {},
  activeConversation: null,

  addMessage: (peerPubkey: string, message: Message) => {
    // Deduplicate by id
    const existing = get().conversations[peerPubkey] ?? [];
    if (existing.some((m) => m.id === message.id)) return;

    set((s) => ({
      conversations: {
        ...s.conversations,
        [peerPubkey]: [...(s.conversations[peerPubkey] ?? []), message].sort(
          (a, b) => a.createdAt - b.createdAt
        ),
      },
    }));
  },

  setActiveConversation: (pubkey) => {
    set({ activeConversation: pubkey });
  },

  getMessages: (peerPubkey: string) => {
    return get().conversations[peerPubkey] ?? [];
  },

  deleteConversation: (peerPubkey: string) => {
    set((s) => {
      const next = { ...s.conversations };
      delete next[peerPubkey];
      return { conversations: next };
    });
  },

  hasMessage: (id: string) => {
    const convs = get().conversations;
    return Object.values(convs).some((msgs) => msgs.some((m) => m.id === id));
  },
}));
