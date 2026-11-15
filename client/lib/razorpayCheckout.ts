import { Platform } from "react-native";

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

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayWebInstance = {
  open: () => void;
  on: (event: string, callback: (event: { error?: { description?: string; reason?: string } }) => void) => void;
};

type RazorpayWebConstructor = new (options: Record<string, unknown>) => RazorpayWebInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayWebConstructor;
  }
}

function loadRazorpayWebCheckout(): Promise<RazorpayWebConstructor> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("Razorpay checkout is only available in a browser."));
      return;
    }
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    const script = existingScript ?? document.createElement("script");
    const onLoad = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay checkout loaded but did not initialise."));
    };
    const onError = () => reject(new Error("Could not load Razorpay checkout. Check your internet connection and retry."));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existingScript) {
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

async function openRazorpayWebCheckout(params: RazorpayOpenParams): Promise<RazorpayOpenResult> {
  try {
    const Razorpay = await loadRazorpayWebCheckout();
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (result: RazorpayOpenResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      const checkout = new Razorpay({
        key: params.keyId,
        amount: params.amountPaise,
        currency: "INR",
        name: params.name ?? "Nature's Grace",
        description: params.description ?? "Practitioner session",
        order_id: params.razorpayOrderId,
        prefill: params.prefill ?? {},
        theme: { color: "#013220" },
        handler: (data: RazorpayPaymentResponse) => finish({
          ok: true,
          paymentId: data.razorpay_payment_id,
          orderId: data.razorpay_order_id,
          signature: data.razorpay_signature,
        }),
        modal: {
          ondismiss: () => finish({ ok: false, cancelled: true }),
        },
      });
      checkout.on("payment.failed", (event) => {
        finish({ ok: false, error: event.error?.description ?? event.error?.reason ?? "Razorpay payment failed." });
      });
      checkout.open();
    });
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not open Razorpay checkout." };
  }
}

/**
 * Opens Razorpay Standard Checkout. Uses Checkout.js on web and the native
 * react-native-razorpay module on iOS/Android.
 */
export async function openRazorpayCheckout(
  params: RazorpayOpenParams
): Promise<RazorpayOpenResult> {
  if (Platform.OS === "web") {
    return openRazorpayWebCheckout(params);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RazorpayCheckout = require("react-native-razorpay").default as {
      open: (options: Record<string, unknown>) => Promise<RazorpayPaymentResponse>;
    };

    const data = await RazorpayCheckout.open({
      key: params.keyId,
      amount: params.amountPaise,
      currency: "INR",
      name: params.name ?? "Nature's Grace",
      description: params.description ?? "Practitioner session",
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
    if (e?.code === 0 || e?.code === 2) {
      return { ok: false, cancelled: true };
    }
    const message = e?.description || e?.message || "Could not open Razorpay checkout";
    if (message.includes("Native module") || message.includes("Cannot find module")) {
      return {
        ok: false,
        error: "Razorpay checkout requires a development build with react-native-razorpay installed.",
      };
    }
    return { ok: false, error: message };
  }
}
