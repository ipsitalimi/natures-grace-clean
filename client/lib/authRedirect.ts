import Constants from "expo-constants";
import * as Linking from "expo-linking";

const AUTH_REDIRECT_PATH = "auth/callback";

function readAuthRedirectOverride(): string | undefined {
  const fromProcess = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (fromProcess) return fromProcess;

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  if (typeof fromExtra === "string" && fromExtra.trim()) {
    return fromExtra.trim();
  }

  return undefined;
}

/** Redirect target for Supabase signup confirmation and password-reset emails. */
export function getAuthRedirectUrl(): string {
  const override = readAuthRedirectOverride();
  if (override) return override;
  return Linking.createURL(`/${AUTH_REDIRECT_PATH}`);
}
