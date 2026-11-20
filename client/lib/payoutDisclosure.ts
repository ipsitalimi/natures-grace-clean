/** Helpers for honest payout / bank disclosure in wallet screens. */

export function isBankAccountLinked(label: string | null | undefined): boolean {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();
  if (normalized === "hdfc bank ···· 4821") return false;
  return !normalized.includes("not linked");
}

export function formatNextPayoutDate(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "Scheduled after admin review";
  return trimmed;
}

export const MANUAL_PAYOUT_NOTICE =
  "Your earnings are calculated from paid sessions and orders. Payouts are handled directly by the Nature's Grace admin team on its payout schedule; you do not need to request a withdrawal.";

export const BANK_NOT_LINKED_NOTICE =
  "Your payout details are managed directly with the Nature's Grace admin team.";
