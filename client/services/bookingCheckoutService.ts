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

async function readResponseBodyForDevLog(res: Response): Promise<string | null> {
  if (!__DEV__) return null;
  try {
    return await res.clone().text();
  } catch (err) {
    console.log("[bookingCheckout][client] response body log failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

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
    const apiUrl = getApiBaseUrl();
    const requestUrl = `${apiUrl}/api/bookings/checkout/create-order`;
    const headers = authJsonHeaders(params.accessToken);
    if (__DEV__) {
      console.log("[bookingCheckout][client] create-order request", {
        apiUrl,
        accessTokenPresent: Boolean(params.accessToken),
        url: requestUrl,
        method: "POST",
        authorizationHeaderPresent: Boolean(headers.Authorization),
      });
    }

    const res = await fetch(requestUrl, {
      method: "POST",
      headers,
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
    const responseBody = await readResponseBodyForDevLog(res);
    if (__DEV__) {
      console.log("[bookingCheckout][client] create-order response", {
        status: res.status,
        body: responseBody,
      });
    }
    const json = (await res.json()) as CheckoutOrderResult & { error?: string };
    if (!res.ok) {
      if (res.status === 401) {
        return {
          error: "Your session expired. Please sign out, sign in again, and retry.",
        };
      }
      return { error: json.error ?? `Server error (${res.status})` };
    }
    return json;
  } catch (err) {
    if (__DEV__) {
      console.log("[bookingCheckout][client] create-order fetch threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
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
    const apiUrl = getApiBaseUrl();
    const requestUrl = `${apiUrl}/api/bookings/checkout/confirm`;
    const headers = authJsonHeaders(params.accessToken);
    if (__DEV__) {
      console.log("[bookingCheckout][client] confirm request", {
        apiUrl,
        accessTokenPresent: Boolean(params.accessToken),
        url: requestUrl,
        method: "POST",
        authorizationHeaderPresent: Boolean(headers.Authorization),
      });
    }

    const res = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        orderId: params.orderId,
        paymentId: params.paymentId,
        signature: params.signature,
        devMode: params.devMode,
        booking: params.booking,
      }),
    });
    const responseBody = await readResponseBodyForDevLog(res);
    if (__DEV__) {
      console.log("[bookingCheckout][client] confirm response", {
        status: res.status,
        body: responseBody,
      });
    }
    const json = (await res.json()) as CheckoutConfirmResult & { error?: string };
    if (!res.ok) {
      if (res.status === 401) {
        return {
          error: "Your session expired. Please sign out, sign in again, and retry.",
        };
      }
      return { error: json.error ?? `Server error (${res.status})` };
    }
    return json;
  } catch (err) {
    if (__DEV__) {
      console.log("[bookingCheckout][client] confirm fetch threw", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return { error: err instanceof Error ? err.message : "Could not confirm payment" };
  }
}

/** @deprecated Use runBookingCheckoutPayment from storeCheckoutService */
export { runBookingCheckoutPayment as runPractitionerCheckout } from "@/services/storeCheckoutService";
