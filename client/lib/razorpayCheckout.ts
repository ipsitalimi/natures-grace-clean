export type RazorpayOpenParams = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  name?: string;
  description?: string;
  prefill?: { email?: string; contact?: string; name?: string };
};

export type RazorpayOpenResult =
  | { ok: true; paymentId: string; orderId: string; signature: string }
  | { ok: false; cancelled?: boolean; error?: string };

/**
 * Opens Razorpay Standard Checkout (native). Requires `react-native-razorpay` in dev builds.
 */
export async function openRazorpayCheckout(
  params: RazorpayOpenParams
): Promise<RazorpayOpenResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RazorpayCheckout = require("react-native-razorpay").default as {
      open: (options: Record<string, unknown>) => Promise<{
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }>;
    };

    const data = await RazorpayCheckout.open({
      key: params.keyId,
      amount: params.amountPaise,
      currency: "INR",
      name: params.name ?? "Nature's Grace",
      description: params.description ?? "Store order",
      order_id: params.razorpayOrderId,
      prefill: params.prefill ?? {},
      theme: { color: "#013220" },
    });

    return {
      ok: true,
      paymentId: data.razorpay_payment_id,
      orderId: data.razorpay_order_id,
      signature: data.razorpay_signature,
    };
  } catch (err: unknown) {
    const e = err as { code?: number; description?: string; message?: string };
    // Razorpay: 0 = payment cancelled by user, 2 = closed
    if (e?.code === 0 || e?.code === 2) {
      return { ok: false, cancelled: true };
    }
    const message =
      e?.description || e?.message || "Could not open Razorpay checkout";
    if (message.includes("Native module") || message.includes("Cannot find module")) {
      return {
        ok: false,
        error:
          "Razorpay checkout requires a development build with react-native-razorpay installed.",
      };
    }
    return { ok: false, error: message };
  }
}
