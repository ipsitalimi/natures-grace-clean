export function isValidPayoutAmount(amount: unknown): amount is number {
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0 && amount <= 100000000;
}
