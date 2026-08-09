/**
 * Stable checkout keys so retries don't create duplicate Razorpay orders / bookings.
 * Razorpay receipt max length is 40 chars.
 */

function compactHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Stable booking receipt for the same user + slot (safe to retry). */
export function buildBookingReceipt(params: {
  userId: string;
  practitionerId: string;
  offeringId?: string;
  sessionDate: string;
  sessionTime: string;
}): string {
  const raw = [
    params.userId,
    params.practitionerId,
    params.offeringId ?? "",
    params.sessionDate,
    params.sessionTime,
  ].join("|");
  return `bk_${compactHash(raw)}`.slice(0, 40);
}

/** Stable store payment receipt derived from the pending order id. */
export function buildStorePaymentReceipt(storeOrderId: string): string {
  return storeOrderId.replace(/-/g, "").slice(0, 40);
}
