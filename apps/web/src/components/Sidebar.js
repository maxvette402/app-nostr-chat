import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useKeyStore } from "../store/keyStore.ts";
import { useContactStore } from "../store/contactStore.ts";
import { useMessageStore } from "../store/messageStore.ts";
import { useRelayStore } from "../store/relayStore.ts";
import RelayStatus from "./RelayStatus.tsx";
export default function Sidebar() {
    const { npub, logout } = useKeyStore();
    const { contacts, addContact, removeContact } = useContactStore();
    const { setActiveConversation, activeConversation, conversations } = useMessageStore();
    const { relays, statuses } = useRelayStore();
    const [showAddContact, setShowAddContact] = useState(false);
    const [showRelays, setShowRelays] = useState(false);
    const [newContactInput, setNewContactInput] = useState("");
    const [newContactName, setNewContactName] = useState("");
    const [addError, setAddError] = useState("");
    const handleAddContact = () => {
        setAddError("");
        try {
            addContact(newContactInput.trim(), newContactName.trim() || undefined);
            setNewContactInput("");
            setNewContactName("");
            setShowAddContact(false);
        }
        catch (e) {
            setAddError(e.message);
        }
    };
    const unreadFor = (pubkey) => (conversations[pubkey] ?? []).filter((m) => m.direction === "received").length;
    const sortedContacts = [...contacts].sort((a, b) => {
        const la = conversations[a.pubkey]?.at(-1)?.createdAt ?? 0;
        const lb = conversations[b.pubkey]?.at(-1)?.createdAt ?? 0;
        return lb - la;
    });
    return (_jsxs("aside", { className: "flex h-full w-72 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-800 px-4 py-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs font-semibold text-indigo-400", children: "Nostr Chat" }), _jsx("p", { className: "truncate text-xs text-gray-500", title: npub ?? "", children: npub ? `${npub.slice(0, 20)}…` : "" })] }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: () => { setShowRelays((v) => !v); setShowAddContact(false); }, title: "Relay settings", className: "rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-200", children: "\uD83D\uDCE1" }), _jsx("button", { onClick: logout, title: "Logout", className: "rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-red-400", children: "\u23FB" })] })] }), showRelays && (_jsxs("div", { className: "border-b border-gray-800 bg-gray-950 px-4 py-3", children: [_jsx("p", { className: "mb-2 text-xs font-semibold text-gray-400", children: "Relays" }), _jsx("div", { className: "space-y-1", children: relays.map((r) => (_jsx(RelayStatus, { url: r.url, status: statuses[r.url] ?? "disconnected", read: r.read, write: r.write }, r.url))) })] })), _jsx("div", { className: "flex-1 overflow-y-auto", children: sortedContacts.length === 0 ? (_jsx("div", { className: "px-4 py-8 text-center text-xs text-gray-600", children: "No contacts yet. Add someone by their npub." })) : (sortedContacts.map((contact) => (_jsx(ContactRow, { contact: contact, active: activeConversation === contact.pubkey, lastMessage: conversations[contact.pubkey]?.at(-1)?.content, onClick: () => setActiveConversation(contact.pubkey), onRemove: () => removeContact(contact.pubkey) }, contact.pubkey)))) }), _jsx("div", { className: "border-t border-gray-800 p-3", children: showAddContact ? (_jsxs("div", { className: "space-y-2", children: [_jsx("input", { className: "input text-xs", placeholder: "npub1\u2026 or hex pubkey", value: newContactInput, onChange: (e) => setNewContactInput(e.target.value), autoFocus: true }), _jsx("input", { className: "input text-xs", placeholder: "Display name (optional)", value: newContactName, onChange: (e) => setNewContactName(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleAddContact() }), addError && (_jsx("p", { className: "text-xs text-red-400", children: addError })), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleAddContact, className: "btn-primary flex-1 text-xs py-1.5", children: "Add" }), _jsx("button", { onClick: () => { setShowAddContact(false); setAddError(""); }, className: "btn-secondary flex-1 text-xs py-1.5", children: "Cancel" })] })] })) : (_jsx("button", { onClick: () => setShowAddContact(true), className: "btn-secondary w-full text-xs", children: "+ Add Contact" })) })] }));
}
function ContactRow({ contact, active, lastMessage, onClick, onRemove, }) {
    const [showMenu, setShowMenu] = useState(false);
    const label = contact.displayName ?? `${contact.npub.slice(0, 12)}…`;
    return (_jsxs("div", { className: `group relative flex cursor-pointer items-center gap-3 px-3 py-3 transition ${active ? "bg-indigo-900/40" : "hover:bg-gray-800"}`, onClick: onClick, children: [_jsx("div", { className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300", children: label[0]?.toUpperCase() ?? "?" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium text-gray-100", children: label }), lastMessage && (_jsx("p", { className: "truncate text-xs text-gray-500", children: lastMessage }))] }), _jsx("button", { className: "hidden group-hover:block rounded p-1 text-gray-500 hover:text-red-400", onClick: (e) => { e.stopPropagation(); onRemove(); }, title: "Remove contact", children: "\u2715" })] }));
}
