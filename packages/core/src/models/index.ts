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
