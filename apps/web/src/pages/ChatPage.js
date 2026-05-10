import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNostr } from "../hooks/useNostr.ts";
import Sidebar from "../components/Sidebar.tsx";
import ConversationView from "../components/ConversationView.tsx";
import { useMessageStore } from "../store/messageStore.ts";
export default function ChatPage() {
    // Initialise relay connections + subscriptions
    useNostr();
    const activeConversation = useMessageStore((s) => s.activeConversation);
    return (_jsxs("div", { className: "flex h-full", children: [_jsx(Sidebar, {}), _jsx("main", { className: "flex flex-1 flex-col overflow-hidden", children: activeConversation ? (_jsx(ConversationView, { peerPubkey: activeConversation })) : (_jsx("div", { className: "flex flex-1 items-center justify-center text-gray-600", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-5xl mb-4", children: "\uD83D\uDD12" }), _jsx("p", { className: "text-lg font-medium", children: "Select a conversation" }), _jsx("p", { className: "text-sm mt-2", children: "Choose a contact from the sidebar or add a new one." })] }) })) })] }));
}
