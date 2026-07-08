/** Supabase returns several variants when sign-in is blocked pending email verification. */
export function isEmailNotConfirmedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed") ||
    lower.includes("not confirmed") ||
    lower.includes("confirm your email")
  );
}
