import Constants from "expo-constants";

/**
 * Supabase env vars are required for live data. Without them, screens show empty/error states.
 */
function readEnvString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readExtraEnv(name: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  return readEnvString(extra?.[name]);
}

function pickPublicEnv(
  staticValue: string | undefined,
  name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_ANON_KEY"
): string | undefined {
  return readEnvString(staticValue) ?? readExtraEnv(name);
}

export function getSupabaseUrl(): string | undefined {
  // Static process.env refs are inlined by Expo Metro/Babel in client bundles.
  return pickPublicEnv(process.env.EXPO_PUBLIC_SUPABASE_URL, "EXPO_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string | undefined {
  return pickPublicEnv(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
