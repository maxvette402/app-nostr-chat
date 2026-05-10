import { create } from "zustand";
export const useMessageStore = create()((set, get) => ({
    conversations: {},
    activeConversation: null,
    addMessage: (peerPubkey, message) => {
        // Deduplicate by id
        const existing = get().conversations[peerPubkey] ?? [];
        if (existing.some((m) => m.id === message.id))
            return;
        set((s) => ({
            conversations: {
                ...s.conversations,
                [peerPubkey]: [...(s.conversations[peerPubkey] ?? []), message].sort((a, b) => a.createdAt - b.createdAt),
            },
        }));
    },
    setActiveConversation: (pubkey) => {
        set({ activeConversation: pubkey });
    },
    getMessages: (peerPubkey) => {
        return get().conversations[peerPubkey] ?? [];
    },
    deleteConversation: (peerPubkey) => {
        set((s) => {
            const next = { ...s.conversations };
            delete next[peerPubkey];
            return { conversations: next };
        });
    },
    hasMessage: (id) => {
        const convs = get().conversations;
        return Object.values(convs).some((msgs) => msgs.some((m) => m.id === id));
    },
}));
