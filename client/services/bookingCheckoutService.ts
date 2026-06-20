import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";

export type BookingCheckoutDraft = {
  practitionerId: string;
  offeringId?: string;
  clientName: string;
  clientEmail?: string;
  serviceName: string;
  sessionDate: string;
  sessionTime: string;
  durationMinutes: number;
  amountInr: number;
  notes?: string;
};

export type CheckoutOrderResult = {
  orderId?: string;
  amountPaise?: number;
  amountInr?: number;
  keyId?: string | null;
  devMode?: boolean;
  error?: string;
};

export type CheckoutConfirmResult = {
  paymentId?: string;
  orderId?: string;
  bookingId?: string;
  bookingNumber?: string;
  error?: string;
};

export async function createCheckoutOrder(params: {
  amountInr: number;
  durationMinutes: number;
  practitionerId: string;
  offeringId?: string;
  receipt: string;
  accessToken: string;
  booking?: BookingCheckoutDraft;
  notes?: Record<string, string>;
}): Promise<CheckoutOrderResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/bookings/checkout/create-order`, {
      method: "POST",
      headers: authJsonHeaders(params.accessToken),
      body: JSON.stringify({
        amountInr: params.amountInr,
        durationMinutes: params.durationMinutes,
        practitionerId: params.practitionerId,
        offeringId: params.offeringId ?? params.booking?.offeringId,
        receipt: params.receipt,
        booking: params.booking,
        notes: params.notes,
      }),
    });
    const json = (await res.json()) as CheckoutOrderResult & { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return json;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reach checkout server" };
  }
}

export async function confirmCheckoutPayment(params: {
  orderId: string;
  paymentId?: string;
  signature?: string;
  devMode?: boolean;
  booking: BookingCheckoutDraft;
  accessToken: string;
}): Promise<CheckoutConfirmResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/bookings/checkout/confirm`, {
      method: "POST",
      headers: authJsonHeaders(params.accessToken),
      body: JSON.stringify({
        orderId: params.orderId,
        paymentId: params.paymentId,
        signature: params.signature,
        devMode: params.devMode,
        booking: params.booking,
      }),
    });
    const json = (await res.json()) as CheckoutConfirmResult & { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return json;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not confirm payment" };
  }
}

/** @deprecated Use runBookingCheckoutPayment from storeCheckoutService */
export { runBookingCheckoutPayment as runPractitionerCheckout } from "@/services/storeCheckoutService";
