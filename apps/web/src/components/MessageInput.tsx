import { useState, useRef } from "react";

interface Props {
  onSend: (text: string, file?: File) => Promise<void>;
}

export default function MessageInput({ onSend }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    setError("");
    setSending(true);
    try {
      await onSend(trimmed, file ?? undefined);
      setText("");
      setFile(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-800 px-4 py-3">
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300">
          <span>&#128196;</span>
          <span className="flex-1 truncate">{file.name}</span>
          <button
            onClick={() => setFile(null)}
            className="text-gray-500 hover:text-red-400"
          >
            &#10005;
          </button>
        </div>
      )}

      {error && (
        <p className="mb-2 text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          title="Attach file"
          className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition"
        >
          &#128206;
        </button>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <textarea
          className="input flex-1 resize-none"
          rows={1}
          placeholder="Message… (Enter to send, Shift+Enter for new line)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ minHeight: "40px", maxHeight: "120px" }}
        />

        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && !file)}
          className="btn-primary flex-shrink-0 px-3 py-2"
        >
          {sending ? (
            <span className="animate-spin">&#8987;</span>
          ) : (
            <span>&#10148;</span>
          )}
        </button>
      </div>
    </div>
  );
}
