export interface Contact {
  pubkey: string;    // hex
  npub: string;      // bech32
  displayName?: string;
  nip05?: string;
  addedAt: number;
}

export interface Message {
  id: string;
  senderPubkey: string;
  recipientPubkey: string;
  content: string;
  fileAttachment?: FileAttachment;
  createdAt: number;
  receivedAt: number;
  direction: "sent" | "received";
}

export interface FileAttachment {
  blossomUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  encryptionKey: string;   // hex-encoded AES-256-GCM key
  encryptionIv: string;    // hex-encoded IV
  sha256: string;          // hex-encoded hash of the encrypted blob, for integrity checks
}

export interface RelayConfig {
  url: string;
  read: boolean;
  write: boolean;
}

export type RelayStatus = "connecting" | "connected" | "disconnected" | "error";

export interface Conversation {
  peerPubkey: string;
  messages: Message[];
  unreadCount: number;
  lastMessageAt: number;
}
