import { Routes, Route, Navigate } from "react-router-dom";
import { useKeyStore } from "./store/keyStore.ts";
import LoginPage from "./pages/LoginPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";

export default function App() {
  const isLoggedIn = useKeyStore((s) => s.isLoggedIn);

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
