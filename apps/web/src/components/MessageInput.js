import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from "react";
export default function MessageInput({ onSend }) {
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef(null);
    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed && !file)
            return;
        setError("");
        setSending(true);
        try {
            await onSend(trimmed, file ?? undefined);
            setText("");
            setFile(null);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setSending(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    return (_jsxs("div", { className: "border-t border-gray-800 px-4 py-3", children: [file && (_jsxs("div", { className: "mb-2 flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300", children: [_jsx("span", { children: "\uD83D\uDCC4" }), _jsx("span", { className: "flex-1 truncate", children: file.name }), _jsx("button", { onClick: () => setFile(null), className: "text-gray-500 hover:text-red-400", children: "\u2715" })] })), error && (_jsx("p", { className: "mb-2 text-xs text-red-400", children: error })), _jsxs("div", { className: "flex items-end gap-2", children: [_jsx("button", { onClick: () => fileRef.current?.click(), title: "Attach file", className: "flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition", children: "\uD83D\uDCCE" }), _jsx("input", { ref: fileRef, type: "file", className: "hidden", onChange: (e) => setFile(e.target.files?.[0] ?? null) }), _jsx("textarea", { className: "input flex-1 resize-none", rows: 1, placeholder: "Message\u2026 (Enter to send, Shift+Enter for new line)", value: text, onChange: (e) => setText(e.target.value), onKeyDown: handleKeyDown, style: { minHeight: "40px", maxHeight: "120px" } }), _jsx("button", { onClick: handleSend, disabled: sending || (!text.trim() && !file), className: "btn-primary flex-shrink-0 px-3 py-2", children: sending ? (_jsx("span", { className: "animate-spin", children: "\u231B" })) : (_jsx("span", { children: "\u27A4" })) })] })] }));
}
