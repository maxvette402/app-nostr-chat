import type { Message } from "@nostr-chat/core";
import { decryptFile } from "@nostr-chat/core";

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function downloadDecryptedFile(msg: Message) {
  const { fileAttachment } = msg;
  if (!fileAttachment) return;
  const response = await fetch(fileAttachment.blossomUrl);
  const ciphertext = await response.arrayBuffer();
  const plaintext = await decryptFile(
    ciphertext,
    fileAttachment.encryptionKey,
    fileAttachment.encryptionIv
  );
  const blob = new Blob([plaintext], { type: fileAttachment.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileAttachment.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MessageBubble({ message }: { message: Message }) {
  const isSent = message.direction === "sent";

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow ${
          isSent
            ? "rounded-br-sm bg-indigo-600 text-white"
            : "rounded-bl-sm bg-gray-800 text-gray-100"
        }`}
      >
        {message.content && (
          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        )}

        {message.fileAttachment && (
          <button
            onClick={() => downloadDecryptedFile(message)}
            className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${
              isSent
                ? "bg-indigo-700 hover:bg-indigo-800"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <span>&#128196;</span>
            <span className="max-w-[200px] truncate">{message.fileAttachment.fileName}</span>
            <span className="text-[10px] opacity-70">
              {(message.fileAttachment.sizeBytes / 1024).toFixed(1)} KB
            </span>
          </button>
        )}

        <p
          className={`mt-1 text-right text-[10px] ${
            isSent ? "text-indigo-300" : "text-gray-500"
          }`}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
