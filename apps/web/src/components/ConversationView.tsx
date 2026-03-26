import { useEffect, useRef } from "react";
import { useKeyStore } from "../store/keyStore.ts";
import { useContactStore } from "../store/contactStore.ts";
import { useMessageStore } from "../store/messageStore.ts";
import MessageBubble from "./MessageBubble.tsx";
import MessageInput from "./MessageInput.tsx";
import { useNostr } from "../hooks/useNostr.ts";

export default function ConversationView({ peerPubkey }: { peerPubkey: string }) {
  const { npub } = useKeyStore();
  const { getContact } = useContactStore();
  const { getMessages } = useMessageStore();
  const { sendMessage } = useNostr();
  const endRef = useRef<HTMLDivElement>(null);

  const contact = getContact(peerPubkey);
  const messages = getMessages(peerPubkey);
  const peerLabel = contact?.displayName ?? `${contact?.npub.slice(0, 16) ?? peerPubkey.slice(0, 16)}…`;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (text: string, file?: File) => {
    await sendMessage(peerPubkey, text, file);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300">
          {peerLabel[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-100">{peerLabel}</p>
          <p className="truncate text-xs text-gray-500 max-w-xs" title={peerPubkey}>
            {peerPubkey.slice(0, 32)}…
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-600">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} />
    </div>
  );
}
