import type { Session, SupabaseClient } from "@supabase/supabase-js";

export function parseAuthCallbackParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");

  if (queryIndex !== -1) {
    const end = hashIndex !== -1 && hashIndex > queryIndex ? hashIndex : url.length;
    new URLSearchParams(url.slice(queryIndex + 1, end)).forEach((value, key) => {
      params[key] = value;
    });
  }

  if (hashIndex !== -1) {
    new URLSearchParams(url.slice(hashIndex + 1)).forEach((value, key) => {
      params[key] = value;
    });
  }

  return params;
}

export function isAuthCallbackUrl(url: string): boolean {
  const params = parseAuthCallbackParams(url);
  return Boolean(
    params.access_token || params.code || params.error || params.error_description
  );
}

export function isPasswordRecoveryCallback(url: string): boolean {
  return parseAuthCallbackParams(url).type === "recovery";
}

/** Current document URL when running in a browser (Expo Web auth callbacks). */
export function readAuthCallbackUrl(): string | null {
  if (typeof window !== "undefined" && window.location?.href) {
    return window.location.href;
  }
  return null;
}

export type CompleteAuthSessionResult = {
  session: Session | null;
  error?: string;
  isPasswordRecovery?: boolean;
};

export function isSignupConfirmationCallback(url: string): boolean {
  return parseAuthCallbackParams(url).type === "signup";
}

/** Complete signup confirmation or password-recovery sessions from a native deep link. */
export async function completeAuthSessionFromUrl(
  supabase: SupabaseClient,
  url: string
): Promise<CompleteAuthSessionResult> {
  if (!isAuthCallbackUrl(url)) {
    return { session: null };
  }

  const params = parseAuthCallbackParams(url);
  const isPasswordRecovery = params.type === "recovery";

  if (params.error || params.error_description) {
    return {
      session: null,
      error: params.error_description ?? params.error ?? "Authentication link failed.",
      isPasswordRecovery,
    };
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) return { session: null, error: error.message, isPasswordRecovery };
    return { session: data.session, isPasswordRecovery };
  }

  if (params.access_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token ?? "",
    });
    if (error) return { session: null, error: error.message, isPasswordRecovery };
    return { session: data.session, isPasswordRecovery };
  }

  return { session: null, isPasswordRecovery };
}
