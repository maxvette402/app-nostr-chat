import { useState } from "react";
import { useKeyStore } from "../store/keyStore.ts";
import { generateKeyPair } from "@nostr-chat/core";

type Tab = "extension" | "nsec" | "generate";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("extension");
  const [nsecInput, setNsecInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ nsec: string; npub: string } | null>(null);

  const { loginWithExtension, loginWithNsec } = useKeyStore();

  const handleExtension = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithExtension();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleNsec = () => {
    setError("");
    try {
      loginWithNsec(nsecInput.trim());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleGenerate = () => {
    const kp = generateKeyPair();
    setGeneratedKey({ nsec: kp.nsec, npub: kp.npub });
  };

  const handleLoginWithGenerated = () => {
    if (!generatedKey) return;
    loginWithNsec(generatedKey.nsec);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "extension", label: "Browser Extension" },
    { id: "nsec", label: "Private Key" },
    { id: "generate", label: "Generate New" },
  ];

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl">
            &#128274;
          </div>
          <h1 className="text-3xl font-bold text-white">Nostr Chat</h1>
          <p className="mt-2 text-sm text-gray-400">
            End-to-end encrypted messaging over Nostr
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-gray-900 p-8 shadow-xl ring-1 ring-gray-800">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg bg-gray-800 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(""); }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                  tab === t.id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "extension" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Connect using a NIP-07 compatible browser extension such as{" "}
                <strong className="text-gray-200">Alby</strong> or{" "}
                <strong className="text-gray-200">nos2x</strong>.
              </p>
              <button
                onClick={handleExtension}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? "Connecting..." : "Connect with Extension"}
              </button>
            </div>
          )}

          {tab === "nsec" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Enter your Nostr private key (<code className="text-indigo-400">nsec1…</code>
                &nbsp;or 64-char hex). Your key never leaves this device.
              </p>
              <input
                type="password"
                className="input"
                placeholder="nsec1… or hex private key"
                value={nsecInput}
                onChange={(e) => setNsecInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNsec()}
              />
              <button
                onClick={handleNsec}
                disabled={!nsecInput.trim()}
                className="btn-primary w-full"
              >
                Login
              </button>
            </div>
          )}

          {tab === "generate" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Generate a new Nostr identity. Save your private key securely — it
                cannot be recovered.
              </p>
              {!generatedKey ? (
                <button onClick={handleGenerate} className="btn-primary w-full">
                  Generate Keypair
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Public key (npub) — share this
                    </label>
                    <div className="break-all rounded-lg bg-gray-800 p-3 text-xs font-mono text-green-400">
                      {generatedKey.npub}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Private key (nsec) — keep secret!
                    </label>
                    <div className="break-all rounded-lg bg-gray-800 p-3 text-xs font-mono text-red-400">
                      {generatedKey.nsec}
                    </div>
                  </div>
                  <p className="text-xs text-yellow-400">
                    Save your nsec key before continuing. You will not see it again.
                  </p>
                  <button
                    onClick={handleLoginWithGenerated}
                    className="btn-primary w-full"
                  >
                    I have saved my key — Login
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="btn-secondary w-full"
                  >
                    Generate another
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-900/40 border border-red-800 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          No account required. No email. No server.
        </p>
      </div>
    </div>
  );
}
