export type EventPricingLine = { label: string; amount: string };

/** Events have no in-app payment — treat empty/zero pricing as free registration. */
export function isEventRegistrationFree(pricing: EventPricingLine[]): boolean {
  if (!pricing.length) return true;
  return pricing.every((line) => {
    const amount = Number(String(line.amount).replace(/[^\d.]/g, ""));
    return !amount || amount === 0;
  });
}

export function eventRegistrationNote(pricing: EventPricingLine[]): string {
  if (isEventRegistrationFree(pricing)) {
    return "Free registration — no payment is collected in the app.";
  }
  return "Registration is free in the app. Any fees shown are for reference — payment, if required, is arranged separately.";
}
