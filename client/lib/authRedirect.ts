import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

const AUTH_REDIRECT_PATH = "auth/callback";
const DEFAULT_APP_SCHEME = "natures-grace";

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

function getAppScheme(): string {
  const scheme = Constants.expoConfig?.scheme;
  if (typeof scheme === "string" && scheme.trim()) {
    return scheme.trim();
  }
  return DEFAULT_APP_SCHEME;
}

/** Stable deep link used in production native builds (Play Store / TestFlight). */
export function getNativeAuthRedirectUrl(): string {
  return `${getAppScheme()}://${AUTH_REDIRECT_PATH}`;
}

function isDevOnlyRedirect(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.startsWith("exp://") ||
    lower.startsWith("exps://")
  );
}

function getWebAuthRedirectUrl(override?: string): string {
  if (override && !isDevOnlyRedirect(override)) {
    return override;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/${AUTH_REDIRECT_PATH}`;
  }
  return override ?? Linking.createURL(`/${AUTH_REDIRECT_PATH}`);
}

/** Redirect target for Supabase signup confirmation and password-reset emails. */
export function getAuthRedirectUrl(): string {
  const override = readAuthRedirectOverride();

  if (Platform.OS === "web") {
    return getWebAuthRedirectUrl(override);
  }

  // Release native builds must never use localhost/exp URLs from dev env.
  if (!__DEV__) {
    return getNativeAuthRedirectUrl();
  }

  if (override && !isDevOnlyRedirect(override)) {
    return override;
  }

  return Linking.createURL(`/${AUTH_REDIRECT_PATH}`);
}
