import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { useKeyStore } from "../store/keyStore.ts";
import { useContactStore } from "../store/contactStore.ts";
import { useMessageStore } from "../store/messageStore.ts";
import MessageBubble from "./MessageBubble.tsx";
import MessageInput from "./MessageInput.tsx";
import { useNostr } from "../hooks/useNostr.ts";
export default function ConversationView({ peerPubkey }) {
    const { npub } = useKeyStore();
    const { getContact } = useContactStore();
    const { getMessages } = useMessageStore();
    const { sendMessage } = useNostr();
    const endRef = useRef(null);
    const contact = getContact(peerPubkey);
    const messages = getMessages(peerPubkey);
    const peerLabel = contact?.displayName ?? `${contact?.npub.slice(0, 16) ?? peerPubkey.slice(0, 16)}…`;
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);
    const handleSend = async (text, file) => {
        await sendMessage(peerPubkey, text, file);
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-gray-800 px-4 py-3", children: [_jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300", children: peerLabel[0]?.toUpperCase() ?? "?" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-100", children: peerLabel }), _jsxs("p", { className: "truncate text-xs text-gray-500 max-w-xs", title: peerPubkey, children: [peerPubkey.slice(0, 32), "\u2026"] })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-4 py-4 space-y-2", children: [messages.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-gray-600", children: "No messages yet. Say hello!" })) : (messages.map((msg) => (_jsx(MessageBubble, { message: msg }, msg.id)))), _jsx("div", { ref: endRef })] }), _jsx(MessageInput, { onSend: handleSend })] }));
}
