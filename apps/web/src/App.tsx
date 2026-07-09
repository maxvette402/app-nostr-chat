import { Routes, Route, Navigate } from "react-router-dom";
import { useKeyStore } from "./store/keyStore.ts";
import LoginPage from "./pages/LoginPage.tsx";
import UnlockPage from "./pages/UnlockPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";

export default function App() {
  const isLoggedIn = useKeyStore((s) => s.isLoggedIn);
  const hasLockedSession = useKeyStore((s) => s.hasLockedSession);

  if (!isLoggedIn && hasLockedSession) {
    return <UnlockPage />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={isLoggedIn ? <ChatPage /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
