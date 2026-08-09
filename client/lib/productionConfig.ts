import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseConfig";
import { getRazorpayKeyId } from "@/lib/razorpayKey";
import { pickPublicEnv } from "@/lib/publicEnv";

/** Returns a user-facing error when required production env vars are missing. */
export function getProductionConfigError(): string | null {
  if (__DEV__) return null;

  const missing: string[] = [];
  if (!getSupabaseUrl()) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!getSupabaseAnonKey()) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  const apiUrl = pickPublicEnv(process.env.EXPO_PUBLIC_API_URL, "EXPO_PUBLIC_API_URL");
  if (!apiUrl) {
    missing.push("EXPO_PUBLIC_API_URL");
  } else if (/localhost|127\.0\.0\.1/i.test(apiUrl)) {
    return "Production build cannot use a localhost API URL. Set EXPO_PUBLIC_API_URL to your Railway API.";
  }

  if (!getRazorpayKeyId()) missing.push("EXPO_PUBLIC_RAZORPAY_KEY_ID");
  else if (/^rzp_test_/i.test(getRazorpayKeyId()!)) {
    return "Production build is using Razorpay test keys. Set EXPO_PUBLIC_RAZORPAY_KEY_ID to a live key (rzp_live_…).";
  }

  if (missing.length === 0) return null;
  return `Production configuration missing: ${missing.join(", ")}`;
}
