/** Helpers for honest payout / bank disclosure in wallet screens. */

export function isBankAccountLinked(label: string | null | undefined): boolean {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) return false;
  return !trimmed.toLowerCase().includes("not linked");
}

export function formatNextPayoutDate(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "Scheduled after admin review";
  return trimmed;
}

export const MANUAL_PAYOUT_NOTICE =
  "Withdrawals are reviewed manually by the Nature's Grace team (typically 3–7 business days). Per-user bank verification is not wired in the app yet — contact support to register payout details.";

export const BANK_NOT_LINKED_NOTICE =
  "Add your bank details via Support before withdrawing. Withdrawal requests are held until an admin verifies your account.";
