export const INR_SYMBOL = "₹";

export function formatInr(amount: number, decimals = 0): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${INR_SYMBOL}0`;
  const formatted = n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${INR_SYMBOL}${formatted}`;
}

export function formatInrSigned(amount: number, decimals = 0): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return formatInr(0, decimals);
  const prefix = n > 0 ? "+" : "-";
  return `${prefix}${formatInr(Math.abs(n), decimals)}`;
}

export function formatInrCompact(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${INR_SYMBOL}0`;
  if (Math.abs(n) >= 1000) {
    return `${INR_SYMBOL}${(n / 1000).toFixed(1)}k`;
  }
  return formatInr(n);
}

export function formatInrOff(amount: number): string {
  return `${formatInr(amount)} OFF`;
}
