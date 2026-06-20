import { pickPublicEnv } from "@/lib/publicEnv";

/** Base URL for the Express API (payout dispatch, webhooks are server-only). */
export function getApiBaseUrl(): string {
  const url = pickPublicEnv(process.env.EXPO_PUBLIC_API_URL, "EXPO_PUBLIC_API_URL");
  if (url) return url.replace(/\/$/, "");
  if (__DEV__) return "http://localhost:5000";
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}
