import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import { verifyPaymentWebhookSignature } from "../server/services/paymentWebhooks";
import { isValidBookingPaymentInput } from "../server/services/razorpayCheckout";
import { isValidPayoutAmount, validateBankDetailsInput } from "../server/lib/walletBank";
import {
  computeSellerPromoDiscount,
  normalizeStoreOrderItems,
} from "../server/services/storeOrderCreation";

test("Razorpay webhook accepts the HMAC for the exact raw request body", () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
  try {
    const rawBody = Buffer.from('{"event":"payment.captured","id":"evt_123"}');
    const signature = createHmac("sha256", "test-webhook-secret")
      .update(rawBody)
      .digest("hex");
    assert.equal(verifyPaymentWebhookSignature(rawBody, signature), true);
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});

test("Razorpay webhook rejects missing, malformed, and incorrect signatures", () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
  try {
    const body = Buffer.from('{"event":"payment.captured"}');
    const valid = createHmac("sha256", "test-webhook-secret").update(body).digest("hex");
    assert.equal(verifyPaymentWebhookSignature(body, undefined), false);
    assert.equal(verifyPaymentWebhookSignature(body, "not-a-signature"), false);
    assert.equal(verifyPaymentWebhookSignature(body, "g".repeat(64)), false);
    assert.equal(verifyPaymentWebhookSignature(body, "0".repeat(64)), false);
    assert.equal(verifyPaymentWebhookSignature(Buffer.from(body.toString() + " "), valid), false);
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});

test("Razorpay webhook fails closed when its secret is not configured", () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  try {
    assert.equal(verifyPaymentWebhookSignature("{}", "0".repeat(64)), false);
  } finally {
    if (previous !== undefined) process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});

test("booking checkout rejects non-finite, fractional, and sub-minimum inputs", () => {
  assert.equal(isValidBookingPaymentInput(60, 500), true);
  assert.equal(isValidBookingPaymentInput(30, 1), true);
  assert.equal(isValidBookingPaymentInput(0, 500), false);
  assert.equal(isValidBookingPaymentInput(30.5, 500), false);
  assert.equal(isValidBookingPaymentInput(60, Number.NaN), false);
  assert.equal(isValidBookingPaymentInput(60, Number.POSITIVE_INFINITY), false);
  assert.equal(isValidBookingPaymentInput(60, 0.5), false);
});

test("payout amounts must be finite positive numbers within the database limit", () => {
  assert.equal(isValidPayoutAmount(1), true);
  assert.equal(isValidPayoutAmount(1250.5), true);
  assert.equal(isValidPayoutAmount(0), false);
  assert.equal(isValidPayoutAmount(-1), false);
  assert.equal(isValidPayoutAmount(Number.NaN), false);
  assert.equal(isValidPayoutAmount(Number.POSITIVE_INFINITY), false);
  assert.equal(isValidPayoutAmount("500"), false);
  assert.equal(isValidPayoutAmount(100000001), false);
});

test("bank details require a valid holder, bank, and four account digits", () => {
  assert.deepEqual(
    validateBankDetailsInput({
      bankName: "  HDFC Bank ",
      last4: "xx 1234",
      accountHolder: "  A User  ",
    }),
    { ok: true, label: "HDFC Bank ···· 1234" }
  );
  assert.equal(validateBankDetailsInput({ bankName: "HDFC", last4: "123", accountHolder: "A User" }).ok, false);
  assert.equal(validateBankDetailsInput({ bankName: "H", last4: "1234", accountHolder: "A User" }).ok, false);
  assert.equal(validateBankDetailsInput({ bankName: "HDFC", last4: "1234", accountHolder: " " }).ok, false);
});

test("duplicate cart lines are consolidated before inventory validation", () => {
  assert.deepEqual(
    normalizeStoreOrderItems([
      { productId: " product-a ", quantity: 2 },
      { productId: "product-b", quantity: 1 },
      { productId: "product-a", quantity: 3 },
    ]),
    {
      ok: true,
      items: [
        { productId: "product-a", quantity: 5 },
        { productId: "product-b", quantity: 1 },
      ],
    }
  );
});

test("store checkout rejects fractional, zero, negative, and malformed quantities", () => {
  assert.equal(normalizeStoreOrderItems([{ productId: "p1", quantity: 1.5 }]).ok, false);
  assert.equal(normalizeStoreOrderItems([{ productId: "p1", quantity: 0 }]).ok, false);
  assert.equal(normalizeStoreOrderItems([{ productId: "p1", quantity: -1 }]).ok, false);
  assert.equal(normalizeStoreOrderItems([{ productId: "p1", quantity: Number.NaN }]).ok, false);
  assert.equal(normalizeStoreOrderItems([{ productId: " ", quantity: 1 }]).ok, false);
});

test("seller promo discounts enforce limits and cap discounts at the subtotal", () => {
  const base = {
    status: "Active",
    discount_type: "percentage",
    discount_value: 20,
    starts_at: null,
    expires_at: null,
    usage_limit: 10,
    usage_count: 2,
    min_order: 100,
  };
  assert.deepEqual(computeSellerPromoDiscount(500, base), { ok: true, discount: 100 });
  assert.deepEqual(
    computeSellerPromoDiscount(500, { ...base, discount_value: 150 }),
    { ok: false, error: "Invalid promo discount" }
  );
  assert.deepEqual(
    computeSellerPromoDiscount(500, { ...base, usage_count: 10 }),
    { ok: false, error: "Promo usage limit reached" }
  );
  assert.deepEqual(
    computeSellerPromoDiscount(50, base),
    { ok: false, error: "Order does not meet promo minimum" }
  );
  assert.deepEqual(
    computeSellerPromoDiscount(50, { ...base, min_order: null, discount_type: "fixed", discount_value: 500 }),
    { ok: true, discount: 50 }
  );
});
