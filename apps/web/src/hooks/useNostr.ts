/**
 * Core Nostr hook.
 * Manages the RelayManager lifecycle and provides send/receive functionality.
 */
import { useEffect, useRef, useCallback } from "react";
import { RelayManager, buildDm, receiveDm, encryptFile, BlossomClient, bytesToHex, createBlossomAuthHeader } from "@nostr-chat/core";
import type { Message, FileAttachment } from "@nostr-chat/core";
import { useKeyStore } from "../store/keyStore.ts";
import { useRelayStore } from "../store/relayStore.ts";
import { useMessageStore } from "../store/messageStore.ts";
import { env } from "../env.ts";

export function useNostr() {
  const managerRef = useRef<RelayManager | null>(null);
  const { publicKey, isLoggedIn, getSigner } = useKeyStore();
  const { relays } = useRelayStore();
  const { addMessage } = useMessageStore();

  // Initialise / reinitialise manager when relays or login state change
  useEffect(() => {
    if (!isLoggedIn || !publicKey) return;

    const manager = new RelayManager();
    manager.setRelays(relays);
    managerRef.current = manager;

    // Subscribe to incoming gift-wrapped DMs (kind 1059) addressed to us
    let signer;
    try {
      signer = getSigner();
    } catch {
      return;
    }
    manager.subscribe(
      "inbox",
      [{ kinds: [1059], "#p": [publicKey], limit: 100 }],
      (event) => {
        receiveDm(event, signer, publicKey).then((msg) => {
          if (!msg) return;

          const peerPubkey =
            msg.direction === "received" ? msg.senderPubkey : msg.recipientPubkey;

          addMessage(peerPubkey, msg);
        });
      }
    );

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, [isLoggedIn, publicKey, relays, getSigner, addMessage]);

  const sendMessage = useCallback(
    async (recipientPubkey: string, text: string, file?: File): Promise<void> => {
      if (!publicKey) {
        throw new Error("Not logged in");
      }
      const manager = managerRef.current;
      if (!manager) throw new Error("Relay manager not initialised");
      const signer = getSigner();

      let fileAttachment: FileAttachment | undefined;

      if (file) {
        const encrypted = await encryptFile(file);
        const hashBuf = await crypto.subtle.digest("SHA-256", encrypted.ciphertext);
        const sha256 = bytesToHex(new Uint8Array(hashBuf));
        const authHeader = await createBlossomAuthHeader("upload", sha256, signer);
        const blossom = new BlossomClient(env.blossomServerUrl);
        const result = await blossom.upload(encrypted.ciphertext, "application/octet-stream", authHeader);
        if (result.sha256 !== sha256) {
          throw new Error("Blossom upload integrity check failed — server returned a mismatched hash");
        }
        fileAttachment = {
          blossomUrl: result.url,
          fileName: encrypted.fileName,
          mimeType: encrypted.mimeType,
          sizeBytes: result.size,
          encryptionKey: encrypted.key,
          encryptionIv: encrypted.iv,
          sha256,
        };
      }

      // Gift-wrap once per participant: the recipient, and ourselves so other
      // sessions/devices logged in with the same key see sent messages too.
      const participants =
        recipientPubkey === publicKey ? [publicKey] : [recipientPubkey, publicKey];
      const { giftWraps, messageId } = await buildDm({ text, fileAttachment }, signer, participants);
      await Promise.all(giftWraps.map((giftWrap) => manager.publish(giftWrap)));

      // Record sent message locally using the shared rumor id so the echo
      // that comes back over the "inbox" subscription dedupes against it.
      const sentMsg: Message = {
        id: messageId,
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
    [publicKey, getSigner, addMessage]
  );

  return { sendMessage, manager: managerRef.current };
}
