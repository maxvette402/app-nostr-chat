import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { decryptFile } from "@nostr-chat/core";
function formatTime(ts) {
    return new Date(ts * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}
async function downloadDecryptedFile(msg) {
    const { fileAttachment } = msg;
    if (!fileAttachment)
        return;
    const response = await fetch(fileAttachment.blossomUrl);
    const ciphertext = await response.arrayBuffer();
    const plaintext = await decryptFile(ciphertext, fileAttachment.encryptionKey, fileAttachment.encryptionIv);
    const blob = new Blob([plaintext], { type: fileAttachment.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileAttachment.fileName;
    a.click();
    URL.revokeObjectURL(url);
}
export default function MessageBubble({ message }) {
    const isSent = message.direction === "sent";
    return (_jsx("div", { className: `flex ${isSent ? "justify-end" : "justify-start"}`, children: _jsxs("div", { className: `max-w-[70%] rounded-2xl px-4 py-2.5 shadow ${isSent
                ? "rounded-br-sm bg-indigo-600 text-white"
                : "rounded-bl-sm bg-gray-800 text-gray-100"}`, children: [message.content && (_jsx("p", { className: "whitespace-pre-wrap break-words text-sm", children: message.content })), message.fileAttachment && (_jsxs("button", { onClick: () => downloadDecryptedFile(message), className: `mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${isSent
                        ? "bg-indigo-700 hover:bg-indigo-800"
                        : "bg-gray-700 hover:bg-gray-600"}`, children: [_jsx("span", { children: "\uD83D\uDCC4" }), _jsx("span", { className: "max-w-[200px] truncate", children: message.fileAttachment.fileName }), _jsxs("span", { className: "text-[10px] opacity-70", children: [(message.fileAttachment.sizeBytes / 1024).toFixed(1), " KB"] })] })), _jsx("p", { className: `mt-1 text-right text-[10px] ${isSent ? "text-indigo-300" : "text-gray-500"}`, children: formatTime(message.createdAt) })] }) }));
}
