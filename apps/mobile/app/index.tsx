import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { keyPairFromNsec, generateKeyPair, isValidNsec } from "@nostr-chat/core";

export default function LoginScreen() {
  const [nsec, setNsec] = useState("");
  const [loading, setLoading] = useState(false);

  const loginWithNsec = async () => {
    if (!isValidNsec(nsec.trim())) {
      Alert.alert("Invalid key", "Please enter a valid nsec1… private key.");
      return;
    }
    setLoading(true);
    try {
      const kp = keyPairFromNsec(nsec.trim());
      // Store nsec encrypted in SecureStore (never logs or transmits)
      await SecureStore.setItemAsync("nostr_nsec", nsec.trim(), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await SecureStore.setItemAsync("nostr_pubkey", kp.publicKey);
      router.replace("/chat");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const generateAndLogin = async () => {
    const kp = generateKeyPair();
    Alert.alert(
      "New Identity Created",
      `Your public key:\n${kp.npub}\n\nYour PRIVATE key (save this!):\n${kp.nsec}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I've saved it — Login",
          onPress: async () => {
            await SecureStore.setItemAsync("nostr_nsec", kp.nsec, {
              keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });
            await SecureStore.setItemAsync("nostr_pubkey", kp.publicKey);
            router.replace("/chat");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Nostr Chat</Text>
        <Text style={styles.subtitle}>End-to-end encrypted messaging</Text>

        <TextInput
          style={styles.input}
          placeholder="nsec1… private key"
          placeholderTextColor="#6b7280"
          value={nsec}
          onChangeText={setNsec}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={loginWithNsec}
          disabled={loading || !nsec.trim()}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in…" : "Login with Private Key"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={generateAndLogin}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Generate New Identity
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f9fafb",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    padding: 12,
    color: "#f9fafb",
    fontSize: 14,
  },
  button: {
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4f46e5",
  },
  secondaryButton: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
  },
  buttonText: {
    color: "#f9fafb",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryButtonText: {
    color: "#9ca3af",
  },
});
