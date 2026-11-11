import { getApiBaseUrl } from "@/lib/apiBase";
import { authJsonHeaders } from "@/lib/apiAuth";
import { getRazorpayKeyId } from "@/lib/razorpayKey";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";

type EventCheckoutOrder = {
  orderId?: string;
  amountPaise?: number;
  amountInr?: number;
  currency?: string;
  keyId?: string | null;
  devMode?: boolean;
  error?: string;
};

type EventCheckoutConfirmation = {
  paymentId?: string;
  orderId?: string;
  registrationId?: string;
  error?: string;
};

export async function runEventCheckoutPayment(params: {
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  message?: string;
  accessToken: string;
}): Promise<EventCheckoutConfirmation> {
  try {
    const baseUrl = getApiBaseUrl();
    const headers = authJsonHeaders(params.accessToken);
    const createResponse = await fetch(`${baseUrl}/api/events/checkout/create-order`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        eventId: params.eventId,
        attendeeName: params.attendeeName,
        attendeeEmail: params.attendeeEmail,
        attendeePhone: params.attendeePhone,
        message: params.message,
      }),
    });
    const order = (await createResponse.json()) as EventCheckoutOrder;
    if (!createResponse.ok || !order.orderId) {
      return { error: order.error ?? `Could not start event payment (${createResponse.status})` };
    }

    if (order.devMode) {
      if (!__DEV__) return { error: "Test payment mode is disabled in production." };
      const response = await fetch(`${baseUrl}/api/events/checkout/confirm`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          orderId: order.orderId,
          paymentId: `pay_dev_${Date.now()}`,
          devMode: true,
        }),
      });
      const result = (await response.json()) as EventCheckoutConfirmation;
      return response.ok ? result : { error: result.error ?? "Could not confirm test payment" };
    }

    const keyId = order.keyId ?? getRazorpayKeyId();
    if (!keyId) return { error: "Razorpay key is not configured." };

    const opened = await openRazorpayCheckout({
      keyId,
      razorpayOrderId: order.orderId,
      amountPaise: order.amountPaise ?? Math.round(Number(order.amountInr) * 100),
      name: "Nature's Grace",
      description: "Community event registration",
      prefill: {
        name: params.attendeeName,
        email: params.attendeeEmail,
        contact: params.attendeePhone,
      },
    });
    if (!opened.ok) {
      return { error: opened.cancelled ? "Payment cancelled." : opened.error ?? "Payment failed." };
    }

    const confirmResponse = await fetch(`${baseUrl}/api/events/checkout/confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        orderId: opened.orderId,
        paymentId: opened.paymentId,
        signature: opened.signature,
      }),
    });
    const confirmation = (await confirmResponse.json()) as EventCheckoutConfirmation;
    if (!confirmResponse.ok) {
      return { error: confirmation.error ?? "Payment was received but confirmation is pending. Refresh before retrying." };
    }
    return confirmation;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not complete event payment." };
  }
}
