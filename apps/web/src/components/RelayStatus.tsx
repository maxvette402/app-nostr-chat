import type { RelayStatus } from "@nostr-chat/core";

const statusColor: Record<RelayStatus, string> = {
  connecting: "bg-yellow-500",
  connected: "bg-green-500",
  disconnected: "bg-gray-500",
  error: "bg-red-500",
};

export default function RelayStatus({
  url,
  status,
  read,
  write,
}: {
  url: string;
  status: RelayStatus;
  read: boolean;
  write: boolean;
}) {
  const short = url.replace(/^wss?:\/\//, "");
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 flex-shrink-0 rounded-full ${statusColor[status]}`}
        title={status}
      />
      <span className="min-w-0 flex-1 truncate text-xs text-gray-400" title={url}>
        {short}
      </span>
      <span className="text-xs text-gray-600">
        {read ? "R" : ""}
        {write ? "W" : ""}
      </span>
    </div>
  );
}
