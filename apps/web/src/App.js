import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from "react-router-dom";
import { useKeyStore } from "./store/keyStore.ts";
import LoginPage from "./pages/LoginPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
export default function App() {
    const isLoggedIn = useKeyStore((s) => s.isLoggedIn);
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: isLoggedIn ? _jsx(Navigate, { to: "/", replace: true }) : _jsx(LoginPage, {}) }), _jsx(Route, { path: "/*", element: isLoggedIn ? _jsx(ChatPage, {}) : _jsx(Navigate, { to: "/login", replace: true }) })] }));
}
