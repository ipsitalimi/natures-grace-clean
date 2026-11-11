export type EventPricingLine = { label: string; amount: string };

/** Events with no configured amount remain free RSVP events. */
export function isEventRegistrationFree(pricing: EventPricingLine[]): boolean {
  if (!pricing.length) return true;
  return pricing.every((line) => {
    const amount = Number(String(line.amount).replace(/[^\d.]/g, ""));
    return !amount || amount === 0;
  });
}

/** Explain whether the customer will pay in-app or simply RSVP. */
export function eventRegistrationNote(pricing: EventPricingLine[]): string {
  if (isEventRegistrationFree(pricing)) {
    return "Free registration — reserve your place in the app.";
  }
  const amount = Number(String(pricing[0]?.amount ?? "").replace(/[^\d.]/g, ""));
  const formatted = Number.isFinite(amount)
    ? `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : "the listed fee";
  return `Registration fee: ${formatted}. Pay securely through Razorpay to confirm your place.`;
}
