import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const statusColor = {
    connecting: "bg-yellow-500",
    connected: "bg-green-500",
    disconnected: "bg-gray-500",
    error: "bg-red-500",
};
export default function RelayStatus({ url, status, read, write, }) {
    const short = url.replace(/^wss?:\/\//, "");
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `h-2 w-2 flex-shrink-0 rounded-full ${statusColor[status]}`, title: status }), _jsx("span", { className: "min-w-0 flex-1 truncate text-xs text-gray-400", title: url, children: short }), _jsxs("span", { className: "text-xs text-gray-600", children: [read ? "R" : "", write ? "W" : ""] })] }));
}
