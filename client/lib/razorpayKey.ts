import { pickPublicEnv } from "@/lib/publicEnv";

/** Publishable Razorpay key id (safe for client checkout UI). */
export function getRazorpayKeyId(): string | null {
  const key = pickPublicEnv(process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID, "EXPO_PUBLIC_RAZORPAY_KEY_ID");
  return key ?? null;
}
