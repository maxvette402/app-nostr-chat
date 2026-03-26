import { useState } from "react";
import { useKeyStore } from "../store/keyStore.ts";
import { useContactStore } from "../store/contactStore.ts";
import { useMessageStore } from "../store/messageStore.ts";
import { useRelayStore } from "../store/relayStore.ts";
import type { Contact } from "@nostr-chat/core";
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
    } catch (e) {
      setAddError((e as Error).message);
    }
  };

  const unreadFor = (pubkey: string) =>
    (conversations[pubkey] ?? []).filter((m) => m.direction === "received").length;

  const sortedContacts = [...contacts].sort((a, b) => {
    const la = conversations[a.pubkey]?.at(-1)?.createdAt ?? 0;
    const lb = conversations[b.pubkey]?.at(-1)?.createdAt ?? 0;
    return lb - la;
  });

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-indigo-400">Nostr Chat</p>
          <p className="truncate text-xs text-gray-500" title={npub ?? ""}>
            {npub ? `${npub.slice(0, 20)}…` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setShowRelays((v) => !v); setShowAddContact(false); }}
            title="Relay settings"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            &#128225;
          </button>
          <button
            onClick={logout}
            title="Logout"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-red-400"
          >
            &#x23FB;
          </button>
        </div>
      </div>

      {/* Relay panel */}
      {showRelays && (
        <div className="border-b border-gray-800 bg-gray-950 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-gray-400">Relays</p>
          <div className="space-y-1">
            {relays.map((r) => (
              <RelayStatus
                key={r.url}
                url={r.url}
                status={statuses[r.url] ?? "disconnected"}
                read={r.read}
                write={r.write}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {sortedContacts.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-600">
            No contacts yet. Add someone by their npub.
          </div>
        ) : (
          sortedContacts.map((contact) => (
            <ContactRow
              key={contact.pubkey}
              contact={contact}
              active={activeConversation === contact.pubkey}
              lastMessage={conversations[contact.pubkey]?.at(-1)?.content}
              onClick={() => setActiveConversation(contact.pubkey)}
              onRemove={() => removeContact(contact.pubkey)}
            />
          ))
        )}
      </div>

      {/* Add contact */}
      <div className="border-t border-gray-800 p-3">
        {showAddContact ? (
          <div className="space-y-2">
            <input
              className="input text-xs"
              placeholder="npub1… or hex pubkey"
              value={newContactInput}
              onChange={(e) => setNewContactInput(e.target.value)}
              autoFocus
            />
            <input
              className="input text-xs"
              placeholder="Display name (optional)"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
            />
            {addError && (
              <p className="text-xs text-red-400">{addError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={handleAddContact} className="btn-primary flex-1 text-xs py-1.5">
                Add
              </button>
              <button
                onClick={() => { setShowAddContact(false); setAddError(""); }}
                className="btn-secondary flex-1 text-xs py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddContact(true)}
            className="btn-secondary w-full text-xs"
          >
            + Add Contact
          </button>
        )}
      </div>
    </aside>
  );
}

function ContactRow({
  contact,
  active,
  lastMessage,
  onClick,
  onRemove,
}: {
  contact: Contact;
  active: boolean;
  lastMessage?: string;
  onClick: () => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const label = contact.displayName ?? `${contact.npub.slice(0, 12)}…`;

  return (
    <div
      className={`group relative flex cursor-pointer items-center gap-3 px-3 py-3 transition ${
        active ? "bg-indigo-900/40" : "hover:bg-gray-800"
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300">
        {label[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-100">{label}</p>
        {lastMessage && (
          <p className="truncate text-xs text-gray-500">{lastMessage}</p>
        )}
      </div>

      {/* Context menu */}
      <button
        className="hidden group-hover:block rounded p-1 text-gray-500 hover:text-red-400"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove contact"
      >
        &#10005;
      </button>
    </div>
  );
}
