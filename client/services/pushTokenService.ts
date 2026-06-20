import { Platform } from "react-native";
import { getSupabase } from "@/lib/supabase";

/**
 * Registers Expo push token when expo-notifications is available.
 * Requires migration 041 `push_tokens` table and optional EXPO_ACCESS_TOKEN on server.
 */
export async function registerPushTokenForUser(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    if (!token) return;

    await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" }
    );
  } catch {
    // expo-notifications may not be installed in dev
  }
}
