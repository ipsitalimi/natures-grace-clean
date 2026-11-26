import { isValidPayoutAmount } from "./walletValidation";

export { isValidPayoutAmount };

/**
 * Pure input validation retained for backwards-compatible tests and callers.
 * It does not store, submit, or collect bank details.
 */
export function validateBankDetailsInput(input: {
  bankName?: unknown;
  last4?: unknown;
  accountHolder?: unknown;
}): { ok: true; label: string } | { ok: false; error: string } {
  const bankName = typeof input.bankName === "string" ? input.bankName.trim() : "";
  const accountHolder = typeof input.accountHolder === "string" ? input.accountHolder.trim() : "";
  const digits = typeof input.last4 === "string" ? input.last4.replace(/\D/g, "") : "";

  if (bankName.length < 2) return { ok: false, error: "Enter a valid bank name." };
  if (!accountHolder) return { ok: false, error: "Enter the account holder name." };
  if (digits.length !== 4) return { ok: false, error: "Enter the last four account digits." };

  return { ok: true, label: `${bankName} ···· ${digits}` };
}
