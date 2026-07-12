import { useState } from "react";
import { useKeyStore } from "../store/keyStore.ts";

export default function UnlockPage() {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { unlock, logout } = useKeyStore();

  const handleUnlock = async () => {
    setError("");
    setLoading(true);
    try {
      await unlock(passphrase);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl">
            &#128274;
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-400">
            Enter your passphrase to unlock your saved key.
          </p>
        </div>

        <div className="rounded-2xl bg-gray-900 p-8 shadow-xl ring-1 ring-gray-800">
          <div className="space-y-4">
            <input
              type="password"
              className="input"
              placeholder="Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              autoFocus
            />
            <button
              onClick={handleUnlock}
              disabled={loading || !passphrase}
              className="btn-primary w-full"
            >
              {loading ? "Unlocking..." : "Unlock"}
            </button>

            {error && (
              <div className="rounded-lg bg-red-900/40 border border-red-800 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={logout}
              className="btn-secondary w-full text-xs"
            >
              Forget this session &amp; use a different key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
