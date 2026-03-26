/**
 * Core Nostr hook.
 * Manages the RelayManager lifecycle and provides send/receive functionality.
 */
import { useEffect, useRef, useCallback } from "react";
import { RelayManager, buildDm, receiveDm, encryptFile, BlossomClient } from "@nostr-chat/core";
import type { Message, FileAttachment } from "@nostr-chat/core";
import { useKeyStore } from "../store/keyStore.ts";
import { useRelayStore } from "../store/relayStore.ts";
import { useMessageStore } from "../store/messageStore.ts";
import { useContactStore } from "../store/contactStore.ts";
import { env } from "../env.ts";

export function useNostr() {
  const managerRef = useRef<RelayManager | null>(null);
  const { privateKey, publicKey, isLoggedIn } = useKeyStore();
  const { relays } = useRelayStore();
  const { addMessage } = useMessageStore();
  const { addContact, contacts } = useContactStore();

  // Initialise / reinitialise manager when relays or login state change
  useEffect(() => {
    if (!isLoggedIn || !publicKey) return;

    const manager = new RelayManager();
    manager.setRelays(relays);
    managerRef.current = manager;

    // Subscribe to incoming gift-wrapped DMs (kind 1059) addressed to us
    if (privateKey) {
      manager.subscribe(
        "inbox",
        [{ kinds: [1059], "#p": [publicKey], limit: 100 }],
        (event) => {
          const msg = receiveDm(event, privateKey, publicKey);
          if (!msg) return;

          const peerPubkey =
            msg.direction === "received" ? msg.senderPubkey : msg.recipientPubkey;

          addMessage(peerPubkey, msg);
        }
      );
    }

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, [isLoggedIn, publicKey, relays]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (recipientPubkey: string, text: string, file?: File): Promise<void> => {
      if (!privateKey || !publicKey) {
        throw new Error("Private key required to send messages");
      }
      const manager = managerRef.current;
      if (!manager) throw new Error("Relay manager not initialised");

      let fileAttachment: FileAttachment | undefined;

      if (file) {
        const encrypted = await encryptFile(file);
        const blossom = new BlossomClient(env.blossomServerUrl);
        const result = await blossom.upload(encrypted.ciphertext, "application/octet-stream");
        fileAttachment = {
          blossomUrl: result.url,
          fileName: encrypted.fileName,
          mimeType: encrypted.mimeType,
          sizeBytes: result.size,
          encryptionKey: encrypted.key,
          encryptionIv: encrypted.iv,
        };
      }

      const giftWrap = buildDm({ text, fileAttachment }, privateKey, recipientPubkey);
      await manager.publish(giftWrap);

      // Record sent message locally
      const sentMsg: Message = {
        id: giftWrap.id,
        senderPubkey: publicKey,
        recipientPubkey,
        content: text,
        fileAttachment,
        createdAt: Math.floor(Date.now() / 1000),
        receivedAt: Math.floor(Date.now() / 1000),
        direction: "sent",
      };
      addMessage(recipientPubkey, sentMsg);
    },
    [privateKey, publicKey, addMessage]
  );

  return { sendMessage, manager: managerRef.current };
}
