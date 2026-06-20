import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

type AuthEmailTemplate =
  | "account_created"
  | "email_verified"
  | "password_changed"
  | "password_reset_requested";

export async function sendAuthEmailHook(
  template: AuthEmailTemplate,
  accessToken: string
): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/hooks/auth-email`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify({ template }),
    });
  } catch {
    // Non-blocking when API server is offline
  }
}

export async function sendPasswordResetRequestedHook(email: string): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/hooks/password-reset-requested`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    // Non-blocking
  }
}

export async function notifyUserHook(
  accessToken: string,
  body: {
    userId: string;
    event: string;
    message: string;
    linkRoute?: string | null;
    linkTargetId?: string | null;
    emailVars?: Record<string, string>;
    emailTemplate?: string;
  }
): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/hooks/notify-user`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify(body),
    });
  } catch {
    // Non-blocking
  }
}

export async function selfNotifyHook(
  accessToken: string,
  body: {
    event: string;
    message: string;
    linkRoute?: string | null;
    linkTargetId?: string | null;
    emailVars?: Record<string, string>;
    emailTemplate?: string;
  }
): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/hooks/self-notify`, {
      method: "POST",
      headers: authJsonHeaders(accessToken),
      body: JSON.stringify(body),
    });
  } catch {
    // Non-blocking
  }
}
