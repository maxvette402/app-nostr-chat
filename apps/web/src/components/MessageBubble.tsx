import { useState } from "react";
import type { Message } from "@nostr-chat/core";
import { decryptFile, bytesToHex } from "@nostr-chat/core";
import { env } from "../env.ts";

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100 MiB

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Strip path separators / control characters a malicious sender could embed in a filename. */
function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[/\\]/g, "_").replace(/[\x00-\x1f]/g, "").trim();
  return cleaned || "download";
}

async function downloadDecryptedFile(msg: Message): Promise<void> {
  const { fileAttachment } = msg;
  if (!fileAttachment) return;

  const attachmentOrigin = new URL(fileAttachment.blossomUrl).origin;
  const trustedOrigin = new URL(env.blossomServerUrl).origin;
  if (attachmentOrigin !== trustedOrigin) {
    throw new Error(
      `Refusing to fetch attachment from untrusted origin ${attachmentOrigin} (expected ${trustedOrigin})`
    );
  }

  const response = await fetch(fileAttachment.blossomUrl);
  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_DOWNLOAD_BYTES) {
    throw new Error("Attachment exceeds the maximum allowed download size");
  }

  const ciphertext = await response.arrayBuffer();
  if (ciphertext.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error("Attachment exceeds the maximum allowed download size");
  }

  const hashBuf = await crypto.subtle.digest("SHA-256", ciphertext);
  const actualHash = bytesToHex(new Uint8Array(hashBuf));
  if (actualHash !== fileAttachment.sha256) {
    throw new Error("Attachment integrity check failed — downloaded content doesn't match the expected hash");
  }

  const plaintext = await decryptFile(
    ciphertext,
    fileAttachment.encryptionKey,
    fileAttachment.encryptionIv
  );
  const blob = new Blob([plaintext], { type: fileAttachment.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFileName(fileAttachment.fileName);
  a.click();
  URL.revokeObjectURL(url);
}

export default function MessageBubble({ message }: { message: Message }) {
  const isSent = message.direction === "sent";
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleDownloadClick = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      await downloadDecryptedFile(message);
    } catch (e) {
      setDownloadError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

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
          <>
            <button
              onClick={handleDownloadClick}
              disabled={downloading}
              className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${
                isSent
                  ? "bg-indigo-700 hover:bg-indigo-800"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <span>&#128196;</span>
              <span className="max-w-[200px] truncate">
                {sanitizeFileName(message.fileAttachment.fileName)}
              </span>
              <span className="text-[10px] opacity-70">
                {(message.fileAttachment.sizeBytes / 1024).toFixed(1)} KB
              </span>
            </button>
            {downloadError && (
              <p className="mt-1 text-[10px] text-red-400">{downloadError}</p>
            )}
          </>
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
