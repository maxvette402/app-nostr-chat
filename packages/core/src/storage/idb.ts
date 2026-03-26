/**
 * IndexedDB storage for messages, contacts, and relay config.
 * All message content is stored as-is (already decrypted at display time
 * and should be stored encrypted in production – left as a v2 enhancement).
 */
import type { Contact, Message, RelayConfig } from "../models/index.js";

const DB_NAME = "nostr-chat";
const DB_VERSION = 1;

type StoreName = "messages" | "contacts" | "relays";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("messages")) {
        const messages = db.createObjectStore("messages", { keyPath: "id" });
        messages.createIndex("by_peer", "senderPubkey", { unique: false });
        messages.createIndex("by_created", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("contacts")) {
        db.createObjectStore("contacts", { keyPath: "pubkey" });
      }

      if (!db.objectStoreNames.contains("relays")) {
        db.createObjectStore("relays", { keyPath: "url" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(
  storeName: StoreName,
  mode: IDBTransactionMode = "readonly"
): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Messages ---

export async function saveMessage(message: Message): Promise<void> {
  const store = await getStore("messages", "readwrite");
  await promisify(store.put(message));
}

export async function getMessages(peerPubkey: string): Promise<Message[]> {
  const db = await openDb();
  const store = db.transaction("messages", "readonly").objectStore("messages");
  const allMessages = await promisify<Message[]>(store.getAll() as IDBRequest<Message[]>);
  return allMessages
    .filter(
      (m) => m.senderPubkey === peerPubkey || m.recipientPubkey === peerPubkey
    )
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getAllMessages(): Promise<Message[]> {
  const store = await getStore("messages");
  return promisify<Message[]>(store.getAll() as IDBRequest<Message[]>);
}

export async function deleteMessages(peerPubkey: string): Promise<void> {
  const messages = await getMessages(peerPubkey);
  const store = await getStore("messages", "readwrite");
  for (const msg of messages) {
    store.delete(msg.id);
  }
}

// --- Contacts ---

export async function saveContact(contact: Contact): Promise<void> {
  const store = await getStore("contacts", "readwrite");
  await promisify(store.put(contact));
}

export async function getContacts(): Promise<Contact[]> {
  const store = await getStore("contacts");
  return promisify<Contact[]>(store.getAll() as IDBRequest<Contact[]>);
}

export async function deleteContact(pubkey: string): Promise<void> {
  const store = await getStore("contacts", "readwrite");
  await promisify(store.delete(pubkey));
}

// --- Relays ---

export async function saveRelay(relay: RelayConfig): Promise<void> {
  const store = await getStore("relays", "readwrite");
  await promisify(store.put(relay));
}

export async function getRelays(): Promise<RelayConfig[]> {
  const store = await getStore("relays");
  return promisify<RelayConfig[]>(store.getAll() as IDBRequest<RelayConfig[]>);
}

export async function deleteRelay(url: string): Promise<void> {
  const store = await getStore("relays", "readwrite");
  await promisify(store.delete(url));
}
