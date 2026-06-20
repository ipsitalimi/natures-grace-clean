import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseConfig";
import { getRazorpayKeyId } from "@/lib/razorpayKey";
import { pickPublicEnv } from "@/lib/publicEnv";

/** Returns a user-facing error when required production env vars are missing. */
export function getProductionConfigError(): string | null {
  if (__DEV__) return null;

  const missing: string[] = [];
  if (!getSupabaseUrl()) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!getSupabaseAnonKey()) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!pickPublicEnv(process.env.EXPO_PUBLIC_API_URL, "EXPO_PUBLIC_API_URL")) {
    missing.push("EXPO_PUBLIC_API_URL");
  }
  if (!getRazorpayKeyId()) missing.push("EXPO_PUBLIC_RAZORPAY_KEY_ID");

  if (missing.length === 0) return null;
  return `Production configuration missing: ${missing.join(", ")}`;
}
