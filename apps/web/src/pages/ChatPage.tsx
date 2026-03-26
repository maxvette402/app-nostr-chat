import { useNostr } from "../hooks/useNostr.ts";
import Sidebar from "../components/Sidebar.tsx";
import ConversationView from "../components/ConversationView.tsx";
import { useMessageStore } from "../store/messageStore.ts";

export default function ChatPage() {
  // Initialise relay connections + subscriptions
  useNostr();

  const activeConversation = useMessageStore((s) => s.activeConversation);

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {activeConversation ? (
          <ConversationView peerPubkey={activeConversation} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-600">
            <div className="text-center">
              <p className="text-5xl mb-4">&#128274;</p>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-2">
                Choose a contact from the sidebar or add a new one.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
