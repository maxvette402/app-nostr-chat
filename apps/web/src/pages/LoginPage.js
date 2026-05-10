import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useKeyStore } from "../store/keyStore.ts";
import { generateKeyPair } from "@nostr-chat/core";
export default function LoginPage() {
    const [tab, setTab] = useState("extension");
    const [nsecInput, setNsecInput] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedKey, setGeneratedKey] = useState(null);
    const { loginWithExtension, loginWithNsec } = useKeyStore();
    const handleExtension = async () => {
        setError("");
        setLoading(true);
        try {
            await loginWithExtension();
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleNsec = () => {
        setError("");
        try {
            loginWithNsec(nsecInput.trim());
        }
        catch (e) {
            setError(e.message);
        }
    };
    const handleGenerate = () => {
        const kp = generateKeyPair();
        setGeneratedKey({ nsec: kp.nsec, npub: kp.npub });
    };
    const handleLoginWithGenerated = () => {
        if (!generatedKey)
            return;
        loginWithNsec(generatedKey.nsec);
    };
    const tabs = [
        { id: "extension", label: "Browser Extension" },
        { id: "nsec", label: "Private Key" },
        { id: "generate", label: "Generate New" },
    ];
    return (_jsx("div", { className: "flex min-h-full flex-col items-center justify-center px-4 py-12", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("div", { className: "mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl", children: "\uD83D\uDD12" }), _jsx("h1", { className: "text-3xl font-bold text-white", children: "Nostr Chat" }), _jsx("p", { className: "mt-2 text-sm text-gray-400", children: "End-to-end encrypted messaging over Nostr" })] }), _jsxs("div", { className: "rounded-2xl bg-gray-900 p-8 shadow-xl ring-1 ring-gray-800", children: [_jsx("div", { className: "mb-6 flex gap-1 rounded-lg bg-gray-800 p-1", children: tabs.map((t) => (_jsx("button", { onClick: () => { setTab(t.id); setError(""); }, className: `flex-1 rounded-md py-1.5 text-xs font-medium transition ${tab === t.id
                                    ? "bg-indigo-600 text-white"
                                    : "text-gray-400 hover:text-gray-200"}`, children: t.label }, t.id))) }), tab === "extension" && (_jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-gray-400", children: ["Connect using a NIP-07 compatible browser extension such as", " ", _jsx("strong", { className: "text-gray-200", children: "Alby" }), " or", " ", _jsx("strong", { className: "text-gray-200", children: "nos2x" }), "."] }), _jsx("button", { onClick: handleExtension, disabled: loading, className: "btn-primary w-full", children: loading ? "Connecting..." : "Connect with Extension" })] })), tab === "nsec" && (_jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-gray-400", children: ["Enter your Nostr private key (", _jsx("code", { className: "text-indigo-400", children: "nsec1\u2026" }), "\u00A0or 64-char hex). Your key never leaves this device."] }), _jsx("input", { type: "password", className: "input", placeholder: "nsec1\u2026 or hex private key", value: nsecInput, onChange: (e) => setNsecInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleNsec() }), _jsx("button", { onClick: handleNsec, disabled: !nsecInput.trim(), className: "btn-primary w-full", children: "Login" })] })), tab === "generate" && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-gray-400", children: "Generate a new Nostr identity. Save your private key securely \u2014 it cannot be recovered." }), !generatedKey ? (_jsx("button", { onClick: handleGenerate, className: "btn-primary w-full", children: "Generate Keypair" })) : (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs text-gray-500", children: "Public key (npub) \u2014 share this" }), _jsx("div", { className: "break-all rounded-lg bg-gray-800 p-3 text-xs font-mono text-green-400", children: generatedKey.npub })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs text-gray-500", children: "Private key (nsec) \u2014 keep secret!" }), _jsx("div", { className: "break-all rounded-lg bg-gray-800 p-3 text-xs font-mono text-red-400", children: generatedKey.nsec })] }), _jsx("p", { className: "text-xs text-yellow-400", children: "Save your nsec key before continuing. You will not see it again." }), _jsx("button", { onClick: handleLoginWithGenerated, className: "btn-primary w-full", children: "I have saved my key \u2014 Login" }), _jsx("button", { onClick: handleGenerate, className: "btn-secondary w-full", children: "Generate another" })] }))] })), error && (_jsx("div", { className: "mt-4 rounded-lg bg-red-900/40 border border-red-800 p-3 text-sm text-red-400", children: error }))] }), _jsx("p", { className: "mt-6 text-center text-xs text-gray-600", children: "No account required. No email. No server." })] }) }));
}
