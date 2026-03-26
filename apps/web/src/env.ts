import { z } from "zod";

const envSchema = z.object({
  VITE_DEFAULT_RELAYS: z
    .string()
    .default("wss://relay.damus.io,wss://relay.nostr.band,wss://nos.lol"),
  VITE_BLOSSOM_SERVER_URL: z
    .string()
    .url()
    .default("http://localhost:3001"),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten());
  throw new Error("Invalid environment configuration");
}

export const env = {
  defaultRelays: parsed.data.VITE_DEFAULT_RELAYS.split(",")
    .map((r) => r.trim())
    .filter(Boolean),
  blossomServerUrl: parsed.data.VITE_BLOSSOM_SERVER_URL,
} as const;
