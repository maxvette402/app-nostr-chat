import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { RelayManager, buildDm, receiveDm, keyPairFromNsec } from "@nostr-chat/core";
import type { Message } from "@nostr-chat/core";

const DEFAULT_RELAYS = [
  { url: "wss://relay.damus.io", read: true, write: true },
  { url: "wss://relay.nostr.band", read: true, write: true },
  { url: "wss://nos.lol", read: true, write: true },
];

// Hardcoded demo recipient — replace with contact selection in a full implementation
const DEMO_RECIPIENT = "";

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [myPubkey, setMyPubkey] = useState("");
  const [manager, setManager] = useState<RelayManager | null>(null);
  const [privkey, setPrivkey] = useState<Uint8Array | null>(null);

  useEffect(() => {
    let mgr: RelayManager;

    (async () => {
      const nsec = await SecureStore.getItemAsync("nostr_nsec");
      const pubkey = await SecureStore.getItemAsync("nostr_pubkey");
      if (!nsec || !pubkey) {
        router.replace("/");
        return;
      }

      const kp = keyPairFromNsec(nsec);
      setMyPubkey(kp.publicKey);
      setPrivkey(kp.privateKey);

      mgr = new RelayManager();
      mgr.setRelays(DEFAULT_RELAYS);
      setManager(mgr);

      mgr.subscribe(
        "inbox",
        [{ kinds: [1059], "#p": [kp.publicKey], limit: 50 }],
        (event) => {
          const msg = receiveDm(event, kp.privateKey, kp.publicKey);
          if (msg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg].sort((a, b) => a.createdAt - b.createdAt);
            });
          }
        }
      );
    })();

    return () => {
      mgr?.destroy();
    };
  }, []);

  const handleSend = async () => {
    if (!text.trim() || !privkey || !DEMO_RECIPIENT) return;
    const giftWrap = buildDm({ text: text.trim() }, privkey, DEMO_RECIPIENT);
    await manager?.publish(giftWrap);
    const sentMsg: Message = {
      id: giftWrap.id,
      senderPubkey: myPubkey,
      recipientPubkey: DEMO_RECIPIENT,
      content: text.trim(),
      createdAt: Math.floor(Date.now() / 1000),
      receivedAt: Math.floor(Date.now() / 1000),
      direction: "sent",
    };
    setMessages((prev) => [...prev, sentMsg]);
    setText("");
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("nostr_nsec");
    await SecureStore.deleteItemAsync("nostr_pubkey");
    manager?.destroy();
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {!DEMO_RECIPIENT && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Set a DEMO_RECIPIENT in chat.tsx to enable messaging.
          </Text>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.direction === "sent" ? styles.sentBubble : styles.receivedBubble,
            ]}
          >
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor="#6b7280"
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || !DEMO_RECIPIENT) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || !DEMO_RECIPIENT}
        >
          <Text style={styles.sendBtnText}>&#10148;</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  headerTitle: { color: "#f9fafb", fontSize: 18, fontWeight: "bold" },
  logoutText: { color: "#ef4444", fontSize: 14 },
  notice: {
    margin: 16,
    padding: 12,
    backgroundColor: "#1f2937",
    borderRadius: 8,
  },
  noticeText: { color: "#9ca3af", fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  bubble: { maxWidth: "75%", borderRadius: 16, padding: 12 },
  sentBubble: { alignSelf: "flex-end", backgroundColor: "#4f46e5", borderBottomRightRadius: 4 },
  receivedBubble: { alignSelf: "flex-start", backgroundColor: "#1f2937", borderBottomLeftRadius: 4 },
  bubbleText: { color: "#f9fafb", fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },
  input: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    padding: 10,
    color: "#f9fafb",
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    padding: 12,
  },
  sendBtnDisabled: { backgroundColor: "#374151" },
  sendBtnText: { color: "#f9fafb", fontSize: 16 },
});
