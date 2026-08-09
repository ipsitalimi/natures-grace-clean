import { buildBookingReceipt } from "@/lib/checkoutIdempotency";
import { tryGetApiBaseUrl } from "@/lib/apiBase";
import { getRazorpayKeyId } from "@/lib/razorpayKey";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import { authJsonHeaders } from "@/lib/apiAuth";
import {
  confirmCheckoutPayment,
  createCheckoutOrder,
  type BookingCheckoutDraft,
} from "@/services/bookingCheckoutService";

export type StorePaymentInit = {
  razorpayOrderId?: string;
  amountPaise?: number;
  amountInr?: number;
  keyId?: string | null;
  devMode?: boolean;
  error?: string;
};

export type StorePaymentConfirm = {
  paymentId?: string;
  orderNumber?: string;
  error?: string;
};

export type StoreOrderCreateResult = {
  orderId?: string;
  orderNumber?: string;
  total?: number;
  error?: string;
};

export async function createStoreOrderViaApi(params: {
  customerName: string;
  customerEmail?: string;
  items: { productId: string; quantity: number }[];
  deliveryOption?: string;
  notes?: string;
  sellerPromoId?: string | null;
  platformPromoId?: string | null;
  accessToken: string;
}): Promise<StoreOrderCreateResult> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) {
    return { error: "Store checkout requires EXPO_PUBLIC_API_URL to be configured." };
  }
  try {
    const res = await fetch(`${baseUrl}/api/store/checkout/create-order`, {
      method: "POST",
      headers: authJsonHeaders(params.accessToken),
      body: JSON.stringify({
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        items: params.items,
        deliveryOption: params.deliveryOption,
        notes: params.notes,
        sellerPromoId: params.sellerPromoId ?? null,
        platformPromoId: params.platformPromoId ?? null,
      }),
    });
    const json = (await res.json()) as StoreOrderCreateResult & { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return json;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reach checkout server" };
  }
}

export async function createStorePaymentOrder(params: {
  storeOrderId: string;
  accessToken: string;
}): Promise<StorePaymentInit> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) {
    return { error: "Store checkout requires EXPO_PUBLIC_API_URL to be configured." };
  }
  try {
    const res = await fetch(`${baseUrl}/api/store/checkout/create-payment`, {
      method: "POST",
      headers: authJsonHeaders(params.accessToken),
      body: JSON.stringify({
        storeOrderId: params.storeOrderId,
      }),
    });
    const json = (await res.json()) as StorePaymentInit & { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return {
      ...json,
      keyId: json.keyId ?? getRazorpayKeyId(),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reach checkout server" };
  }
}

export async function confirmStorePayment(params: {
  storeOrderId: string;
  razorpayOrderId: string;
  paymentId: string;
  signature?: string;
  devMode?: boolean;
  accessToken: string;
}): Promise<StorePaymentConfirm> {
  const baseUrl = tryGetApiBaseUrl();
  if (!baseUrl) {
    return { error: "Store checkout requires EXPO_PUBLIC_API_URL to be configured." };
  }
  try {
    const res = await fetch(`${baseUrl}/api/store/checkout/confirm-payment`, {
      method: "POST",
      headers: authJsonHeaders(params.accessToken),
      body: JSON.stringify({
        storeOrderId: params.storeOrderId,
        razorpayOrderId: params.razorpayOrderId,
        paymentId: params.paymentId,
        signature: params.signature,
        devMode: params.devMode,
      }),
    });
    const json = (await res.json()) as StorePaymentConfirm & { error?: string };
    if (!res.ok) return { error: json.error ?? `Server error (${res.status})` };
    return json;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not confirm payment" };
  }
}

/** Create Razorpay order → open checkout → verify on server → mark store order Paid. */
export async function runStoreCheckoutPayment(params: {
  storeOrderId: string;
  amountInr: number;
  accessToken: string;
  customerName?: string;
  customerEmail?: string;
}): Promise<StorePaymentConfirm & { paymentId?: string }> {
  const init = await createStorePaymentOrder({
    storeOrderId: params.storeOrderId,
    accessToken: params.accessToken,
  });

  if (init.error || !init.razorpayOrderId) {
    return { error: init.error ?? "Could not start payment" };
  }

  const chargeInr = init.amountInr ?? params.amountInr;

  if (init.devMode) {
    if (!__DEV__) {
      return { error: "Payment is not configured for production" };
    }
    const devPaymentId = `pay_dev_${Date.now()}`;
    return confirmStorePayment({
      storeOrderId: params.storeOrderId,
      razorpayOrderId: init.razorpayOrderId,
      paymentId: devPaymentId,
      devMode: true,
      accessToken: params.accessToken,
    });
  }

  const keyId = init.keyId ?? getRazorpayKeyId();
  if (!keyId) {
    return { error: "Razorpay key is not configured (EXPO_PUBLIC_RAZORPAY_KEY_ID)" };
  }

  const opened = await openRazorpayCheckout({
    keyId,
    razorpayOrderId: init.razorpayOrderId,
    amountPaise: init.amountPaise ?? Math.round(chargeInr * 100),
    prefill: {
      name: params.customerName,
      email: params.customerEmail,
    },
  });

  if (!opened.ok) {
    if (opened.cancelled) {
      return { error: "Payment cancelled" };
    }
    return { error: opened.error ?? "Payment failed" };
  }

  return confirmStorePayment({
    storeOrderId: params.storeOrderId,
    razorpayOrderId: opened.orderId,
    paymentId: opened.paymentId,
    signature: opened.signature,
    accessToken: params.accessToken,
  });
}

export type BookingCheckoutResult = {
  paymentId?: string;
  bookingId?: string;
  bookingNumber?: string;
  error?: string;
};

/** Practitioner bookings: pay on server-verified checkout → server creates Paid booking. */
export async function runBookingCheckoutPayment(params: {
  amountInr: number;
  durationMinutes: number;
  practitionerId: string;
  accessToken: string;
  userId?: string;
  booking: BookingCheckoutDraft;
  customerName?: string;
  customerEmail?: string;
}): Promise<BookingCheckoutResult> {
  const receipt = buildBookingReceipt({
    userId: params.userId ?? "session",
    practitionerId: params.practitionerId,
    offeringId: params.booking.offeringId,
    sessionDate: params.booking.sessionDate,
    sessionTime: params.booking.sessionTime,
  });
  if (__DEV__) {
    console.log("[bookingCheckout] runBookingCheckoutPayment start", {
      amountInr: params.amountInr,
      practitionerId: params.practitionerId,
      offeringId: params.booking.offeringId,
      receipt,
    });
  }
  const order = await createCheckoutOrder({
    amountInr: params.amountInr,
    durationMinutes: params.durationMinutes,
    practitionerId: params.practitionerId,
    offeringId: params.booking.offeringId,
    receipt,
    accessToken: params.accessToken,
    booking: params.booking,
  });
  if (order.error || !order.orderId) {
    return { error: order.error ?? "Could not create payment order" };
  }

  if (__DEV__) {
    console.log("[bookingCheckout] create-order ok, opening Razorpay", {
      orderId: order.orderId,
      amountPaise: order.amountPaise,
      devMode: order.devMode,
      hasKeyId: Boolean(order.keyId ?? getRazorpayKeyId()),
    });
  }

  if (order.devMode) {
    if (!__DEV__) {
      return { error: "Payment is not configured for production" };
    }
    const confirm = await confirmCheckoutPayment({
      orderId: order.orderId,
      paymentId: `pay_dev_${Date.now()}`,
      devMode: true,
      booking: params.booking,
      accessToken: params.accessToken,
    });
    if (confirm.error || !confirm.paymentId) {
      return { error: confirm.error ?? "Payment confirmation failed" };
    }
    return {
      paymentId: confirm.paymentId,
      bookingId: confirm.bookingId,
      bookingNumber: confirm.bookingNumber,
    };
  }

  const keyId = order.keyId ?? getRazorpayKeyId();
  if (!keyId) {
    return { error: "Razorpay key is not configured" };
  }

  const opened = await openRazorpayCheckout({
    keyId,
    razorpayOrderId: order.orderId,
    amountPaise: order.amountPaise ?? Math.round(params.amountInr * 100),
    prefill: {
      name: params.customerName,
      email: params.customerEmail,
    },
  });

  if (!opened.ok) {
    return { error: opened.cancelled ? "Payment cancelled" : opened.error ?? "Payment failed" };
  }

  const confirm = await confirmCheckoutPayment({
    orderId: opened.orderId,
    paymentId: opened.paymentId,
    signature: opened.signature,
    booking: params.booking,
    accessToken: params.accessToken,
  });

  if (confirm.error || !confirm.paymentId) {
    return { error: confirm.error ?? "Payment confirmation failed" };
  }

  return {
    paymentId: confirm.paymentId,
    bookingId: confirm.bookingId,
    bookingNumber: confirm.bookingNumber,
  };
}
