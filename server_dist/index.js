var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/lib/productionEnv.ts
var productionEnv_exports = {};
__export(productionEnv_exports, {
  assertServerProductionEnv: () => assertServerProductionEnv
});
function assertServerProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;
  const missing = [];
  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!process.env.RAZORPAY_KEY_ID?.trim() && !process.env.RAZORPAYX_KEY_ID?.trim()) {
    missing.push("RAZORPAY_KEY_ID");
  }
  if (!process.env.RAZORPAY_KEY_SECRET?.trim() && !process.env.RAZORPAYX_KEY_SECRET?.trim()) {
    missing.push("RAZORPAY_KEY_SECRET");
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim() && !process.env.RAZORPAYX_WEBHOOK_SECRET?.trim()) {
    missing.push("RAZORPAY_WEBHOOK_SECRET");
  }
  if (missing.length > 0) {
    throw new Error(
      `Production server missing required environment variables: ${missing.join(", ")}`
    );
  }
}
var init_productionEnv = __esm({
  "server/lib/productionEnv.ts"() {
    "use strict";
  }
});

// server/index.ts
import { config as loadEnv } from "dotenv";
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// server/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";
var adminClient = null;
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !serviceKey?.trim()) {
    return null;
  }
  if (!adminClient) {
    adminClient = createClient(url.trim(), serviceKey.trim(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return adminClient;
}
function requireSupabaseAdmin() {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL are required for payout webhooks"
    );
  }
  return client;
}

// server/services/payoutLifecycle.ts
var TERMINAL = ["Completed", "Failed", "Cancelled"];
async function getPayoutById(supabase, payoutId) {
  const { data, error } = await supabase.from("seller_payouts").select("*").eq("id", payoutId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function getPayoutByRazorpayId(supabase, razorpayPayoutId) {
  const { data, error } = await supabase.from("seller_payouts").select("*").eq("razorpay_payout_id", razorpayPayoutId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function getWallet(supabase, walletId) {
  const { data, error } = await supabase.from("seller_wallets").select("id, available_balance, pending_payout, held_balance, total_earned").eq("id", walletId).single();
  if (error || !data) throw new Error(error?.message ?? "Wallet not found");
  return data;
}
async function updateWalletBalances(supabase, walletId, patch) {
  const { error } = await supabase.from("seller_wallets").update(patch).eq("id", walletId);
  if (error) throw new Error(error.message);
}
async function updatePayoutTxnDescription(supabase, payoutId, description) {
  await supabase.from("wallet_transactions").update({ description }).eq("payout_id", payoutId).eq("category", "payout");
}
async function reconcilePendingPayout(supabase, walletId) {
  const { data: payouts, error } = await supabase.from("seller_payouts").select("amount, status").eq("wallet_id", walletId).in("status", ["Pending", "Processing"]);
  if (error) throw new Error(error.message);
  const pendingSum = (payouts ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  await updateWalletBalances(supabase, walletId, { pending_payout: pendingSum });
}
async function markPayoutProcessing(supabase, payoutId, opts) {
  const payout = await getPayoutById(supabase, payoutId);
  if (!payout) throw new Error("Payout not found");
  if (TERMINAL.includes(payout.status)) return payout;
  const { data, error } = await supabase.from("seller_payouts").update({
    status: "Processing",
    razorpay_payout_id: opts.razorpayPayoutId ?? payout.razorpay_payout_id,
    razorpay_fund_account_id: opts.razorpayFundAccountId ?? payout.razorpay_fund_account_id,
    notes: opts.notes ?? payout.notes,
    last_webhook_event: opts.webhookEvent ?? null
  }).eq("id", payoutId).select().single();
  if (error) throw new Error(error.message);
  await reconcilePendingPayout(supabase, payout.wallet_id);
  return data;
}
async function completePayout(supabase, payoutId, opts = {}) {
  const payout = await getPayoutById(supabase, payoutId);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "Completed") return payout;
  const amount = Number(payout.amount);
  const wallet = await getWallet(supabase, payout.wallet_id);
  const { data, error } = await supabase.from("seller_payouts").update({
    status: "Completed",
    razorpay_payout_id: opts.razorpayPayoutId ?? payout.razorpay_payout_id,
    razorpay_fund_account_id: opts.razorpayFundAccountId ?? payout.razorpay_fund_account_id,
    completed_at: (/* @__PURE__ */ new Date()).toISOString(),
    last_webhook_event: opts.webhookEvent ?? null,
    failure_reason: null,
    notes: opts.notes ?? payout.notes
  }).eq("id", payoutId).select().single();
  if (error) throw new Error(error.message);
  await updateWalletBalances(supabase, payout.wallet_id, {
    pending_payout: Math.max(0, Number(wallet.pending_payout) - amount)
  });
  await updatePayoutTxnDescription(
    supabase,
    payoutId,
    "Payout to Bank Account (completed)"
  );
  await reconcilePendingPayout(supabase, payout.wallet_id);
  return data;
}
async function failPayout(supabase, payoutId, opts = {}) {
  const payout = await getPayoutById(supabase, payoutId);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "Failed") return payout;
  if (payout.status === "Completed") {
    throw new Error("Cannot fail a completed payout");
  }
  const amount = Number(payout.amount);
  const wallet = await getWallet(supabase, payout.wallet_id);
  const { data, error } = await supabase.from("seller_payouts").update({
    status: "Failed",
    failure_reason: opts.failureReason ?? "Payout failed",
    razorpay_payout_id: opts.razorpayPayoutId ?? payout.razorpay_payout_id,
    last_webhook_event: opts.webhookEvent ?? null
  }).eq("id", payoutId).select().single();
  if (error) throw new Error(error.message);
  const wasReserved = payout.status === "Pending" || payout.status === "Processing";
  if (wasReserved) {
    await updateWalletBalances(supabase, payout.wallet_id, {
      pending_payout: Math.max(0, Number(wallet.pending_payout) - amount),
      available_balance: Number(wallet.available_balance) + amount
    });
    const { data: existingRefund } = await supabase.from("wallet_transactions").select("id").eq("payout_id", payoutId).eq("category", "adjustment").eq("type", "credit").maybeSingle();
    if (!existingRefund) {
      await supabase.from("wallet_transactions").insert({
        wallet_id: payout.wallet_id,
        payout_id: payoutId,
        type: "credit",
        category: "adjustment",
        amount,
        description: `Payout failed \u2014 ${opts.failureReason ?? "refunded to wallet"}`,
        is_released: true
      });
    }
  }
  await updatePayoutTxnDescription(
    supabase,
    payoutId,
    `Payout failed \u2014 ${opts.failureReason ?? "not processed"}`
  );
  await reconcilePendingPayout(supabase, payout.wallet_id);
  return data;
}
async function applyRazorpayPayoutStatus(supabase, entity, webhookEvent) {
  const razorpayId = entity.id;
  const referenceId = entity.reference_id;
  let payout = (razorpayId ? await getPayoutByRazorpayId(supabase, razorpayId) : null) ?? (referenceId ? await getPayoutById(supabase, referenceId) : null);
  if (!payout) return null;
  const normalized = (entity.status ?? "").toLowerCase();
  if (normalized === "processed" || webhookEvent === "payout.processed" || webhookEvent === "payout.updated.processed") {
    const done = await completePayout(supabase, payout.id, {
      razorpayPayoutId: razorpayId ?? payout.razorpay_payout_id ?? void 0,
      razorpayFundAccountId: entity.fund_account_id ?? void 0,
      webhookEvent
    });
    return { payoutId: done.id, status: done.status };
  }
  if (normalized === "failed" || normalized === "reversed" || normalized === "cancelled" || webhookEvent.includes("failed") || webhookEvent.includes("reversed")) {
    const failed = await failPayout(supabase, payout.id, {
      failureReason: entity.failure_reason ?? normalized,
      razorpayPayoutId: razorpayId ?? void 0,
      webhookEvent
    });
    return { payoutId: failed.id, status: failed.status };
  }
  if (normalized === "processing" || normalized === "queued" || normalized === "pending" || webhookEvent === "payout.initiated" || webhookEvent === "payout.queued") {
    const processing = await markPayoutProcessing(supabase, payout.id, {
      razorpayPayoutId: razorpayId ?? void 0,
      razorpayFundAccountId: entity.fund_account_id ?? void 0,
      webhookEvent
    });
    return { payoutId: processing.id, status: processing.status };
  }
  return { payoutId: payout.id, status: payout.status };
}

// server/services/practitionerPayoutLifecycle.ts
var TERMINAL2 = ["Completed", "Failed", "Cancelled"];
async function getPayoutById2(supabase, payoutId) {
  const { data, error } = await supabase.from("practitioner_payouts").select("*").eq("id", payoutId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function getPayoutByRazorpayId2(supabase, razorpayPayoutId) {
  const { data, error } = await supabase.from("practitioner_payouts").select("*").eq("razorpay_payout_id", razorpayPayoutId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function getWallet2(supabase, walletId) {
  const { data, error } = await supabase.from("practitioner_wallets").select("id, available_balance, pending_payout, held_balance, total_earned").eq("id", walletId).single();
  if (error || !data) throw new Error(error?.message ?? "Wallet not found");
  return data;
}
async function updateWalletBalances2(supabase, walletId, patch) {
  const { error } = await supabase.from("practitioner_wallets").update(patch).eq("id", walletId);
  if (error) throw new Error(error.message);
}
async function updatePayoutTxnDescription2(supabase, payoutId, description) {
  await supabase.from("practitioner_wallet_transactions").update({ description }).eq("payout_id", payoutId).eq("category", "payout");
}
async function reconcilePendingPayout2(supabase, walletId) {
  const { data: payouts, error } = await supabase.from("practitioner_payouts").select("amount, status").eq("wallet_id", walletId).in("status", ["Pending", "Processing"]);
  if (error) throw new Error(error.message);
  const pendingSum = (payouts ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  await updateWalletBalances2(supabase, walletId, { pending_payout: pendingSum });
}
async function markPayoutProcessing2(supabase, payoutId, opts) {
  const payout = await getPayoutById2(supabase, payoutId);
  if (!payout) throw new Error("Payout not found");
  if (TERMINAL2.includes(payout.status)) return payout;
  const { data, error } = await supabase.from("practitioner_payouts").update({
    status: "Processing",
    razorpay_payout_id: opts.razorpayPayoutId ?? payout.razorpay_payout_id,
    razorpay_fund_account_id: opts.razorpayFundAccountId ?? payout.razorpay_fund_account_id,
    notes: opts.notes ?? payout.notes,
    last_webhook_event: opts.webhookEvent ?? null
  }).eq("id", payoutId).select().single();
  if (error) throw new Error(error.message);
  await reconcilePendingPayout2(supabase, payout.wallet_id);
  return data;
}
async function completePayout2(supabase, payoutId, opts = {}) {
  const payout = await getPayoutById2(supabase, payoutId);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "Completed") return payout;
  const amount = Number(payout.amount);
  const wallet = await getWallet2(supabase, payout.wallet_id);
  const { data, error } = await supabase.from("practitioner_payouts").update({
    status: "Completed",
    razorpay_payout_id: opts.razorpayPayoutId ?? payout.razorpay_payout_id,
    razorpay_fund_account_id: opts.razorpayFundAccountId ?? payout.razorpay_fund_account_id,
    completed_at: (/* @__PURE__ */ new Date()).toISOString(),
    last_webhook_event: opts.webhookEvent ?? null,
    failure_reason: null,
    notes: opts.notes ?? payout.notes
  }).eq("id", payoutId).select().single();
  if (error) throw new Error(error.message);
  await updateWalletBalances2(supabase, payout.wallet_id, {
    pending_payout: Math.max(0, Number(wallet.pending_payout) - amount)
  });
  await updatePayoutTxnDescription2(
    supabase,
    payoutId,
    "Payout to Bank Account (completed)"
  );
  await reconcilePendingPayout2(supabase, payout.wallet_id);
  return data;
}
async function failPayout2(supabase, payoutId, opts = {}) {
  const payout = await getPayoutById2(supabase, payoutId);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "Failed") return payout;
  if (payout.status === "Completed") {
    throw new Error("Cannot fail a completed payout");
  }
  const amount = Number(payout.amount);
  const wallet = await getWallet2(supabase, payout.wallet_id);
  const { data, error } = await supabase.from("practitioner_payouts").update({
    status: "Failed",
    failure_reason: opts.failureReason ?? "Payout failed",
    razorpay_payout_id: opts.razorpayPayoutId ?? payout.razorpay_payout_id,
    last_webhook_event: opts.webhookEvent ?? null
  }).eq("id", payoutId).select().single();
  if (error) throw new Error(error.message);
  const wasReserved = payout.status === "Pending" || payout.status === "Processing";
  if (wasReserved) {
    await updateWalletBalances2(supabase, payout.wallet_id, {
      pending_payout: Math.max(0, Number(wallet.pending_payout) - amount),
      available_balance: Number(wallet.available_balance) + amount
    });
    const { data: existingRefund } = await supabase.from("practitioner_wallet_transactions").select("id").eq("payout_id", payoutId).eq("category", "adjustment").eq("type", "credit").maybeSingle();
    if (!existingRefund) {
      await supabase.from("practitioner_wallet_transactions").insert({
        wallet_id: payout.wallet_id,
        payout_id: payoutId,
        type: "credit",
        category: "adjustment",
        amount,
        description: `Payout failed \u2014 ${opts.failureReason ?? "refunded to wallet"}`,
        is_released: true
      });
    }
  }
  await updatePayoutTxnDescription2(
    supabase,
    payoutId,
    `Payout failed \u2014 ${opts.failureReason ?? "not processed"}`
  );
  await reconcilePendingPayout2(supabase, payout.wallet_id);
  return data;
}
async function applyRazorpayPayoutStatus2(supabase, entity, webhookEvent) {
  const razorpayId = entity.id;
  const referenceId = entity.reference_id;
  let payout = (razorpayId ? await getPayoutByRazorpayId2(supabase, razorpayId) : null) ?? (referenceId ? await getPayoutById2(supabase, referenceId) : null);
  if (!payout) return null;
  const normalized = (entity.status ?? "").toLowerCase();
  if (normalized === "processed" || webhookEvent === "payout.processed" || webhookEvent === "payout.updated.processed") {
    const done = await completePayout2(supabase, payout.id, {
      razorpayPayoutId: razorpayId ?? payout.razorpay_payout_id ?? void 0,
      razorpayFundAccountId: entity.fund_account_id ?? void 0,
      webhookEvent
    });
    return { payoutId: done.id, status: done.status };
  }
  if (normalized === "failed" || normalized === "reversed" || normalized === "cancelled" || webhookEvent.includes("failed") || webhookEvent.includes("reversed")) {
    const failed = await failPayout2(supabase, payout.id, {
      failureReason: entity.failure_reason ?? normalized,
      razorpayPayoutId: razorpayId ?? void 0,
      webhookEvent
    });
    return { payoutId: failed.id, status: failed.status };
  }
  if (normalized === "processing" || normalized === "queued" || normalized === "pending" || webhookEvent === "payout.initiated" || webhookEvent === "payout.queued") {
    const processing = await markPayoutProcessing2(supabase, payout.id, {
      razorpayPayoutId: razorpayId ?? void 0,
      razorpayFundAccountId: entity.fund_account_id ?? void 0,
      webhookEvent
    });
    return { payoutId: processing.id, status: processing.status };
  }
  return { payoutId: payout.id, status: payout.status };
}

// server/services/razorpayX.ts
import crypto from "node:crypto";
function getAuthHeader() {
  const keyId = process.env.RAZORPAYX_KEY_ID ?? process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET ?? process.env.RAZORPAY_KEY_SECRET;
  if (!keyId?.trim() || !keySecret?.trim()) return null;
  const token = Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString("base64");
  return `Basic ${token}`;
}
function isRazorpayConfigured() {
  return Boolean(getAuthHeader());
}
async function createRazorpayPayout(params) {
  const auth = getAuthHeader();
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER?.trim();
  const fundAccountId = params.fundAccountId?.trim() ?? process.env.RAZORPAYX_FUND_ACCOUNT_ID?.trim();
  if (!auth) {
    return { ok: false, error: "RazorpayX credentials not configured", skipped: true };
  }
  if (!accountNumber) {
    return { ok: false, error: "RAZORPAYX_ACCOUNT_NUMBER is not set" };
  }
  if (!fundAccountId) {
    return { ok: false, error: "RAZORPAYX_FUND_ACCOUNT_ID is not set" };
  }
  const amountPaise = Math.round(params.amountInr * 100);
  if (amountPaise < 100) {
    return { ok: false, error: "Payout amount below minimum (Rs. 1)" };
  }
  const body = {
    account_number: accountNumber,
    fund_account_id: fundAccountId,
    amount: amountPaise,
    currency: "INR",
    mode: process.env.RAZORPAYX_PAYOUT_MODE?.trim() || "IMPS",
    purpose: "payout",
    queue_if_low_balance: true,
    reference_id: params.referenceId,
    narration: params.narration ?? "Nature's Grace seller payout"
  };
  try {
    const res = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.error?.description ?? json.error?.reason ?? `RazorpayX HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    if (!json.id) {
      return { ok: false, error: "RazorpayX returned no payout id" };
    }
    return {
      ok: true,
      payoutId: json.id,
      fundAccountId: json.fund_account_id ?? fundAccountId,
      status: json.status ?? "processing"
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "RazorpayX request failed"
    };
  }
}
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAYX_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signature) return false;
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return expected === signature;
  }
}

// server/middleware/auth.ts
async function getBearerUser(req) {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}
async function getBearerProfile(req) {
  const user = await getBearerUser(req);
  if (!user) return null;
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.from("profiles").select("id, email, role").eq("id", user.id).maybeSingle();
  if (error || !data) return null;
  return data;
}
async function requireBearerUser(req, res) {
  const user = await getBearerUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}
async function requireRole(req, res, role) {
  const profile = await getBearerProfile(req);
  if (!profile) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  if (profile.role !== role) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return profile;
}

// server/services/sellerWalletLedger.ts
function netEarning(gross, commissionRate) {
  return Math.round(gross * (1 - commissionRate / 100) * 100) / 100;
}
async function getOrCreateSellerWallet(supabase, sellerId, commissionRate) {
  const { data: existing } = await supabase.from("seller_wallets").select("*").eq("seller_id", sellerId).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from("seller_wallets").insert({
    seller_id: sellerId,
    commission_rate: commissionRate,
    bank_account_label: null,
    next_payout_date: null
  }).select().single();
  if (error || !data) return null;
  return data;
}
async function updateWalletBalances3(supabase, walletId, patch) {
  await supabase.from("seller_wallets").update(patch).eq("id", walletId);
}
async function hasTransaction(supabase, walletId, orderId, category) {
  const { data } = await supabase.from("wallet_transactions").select("id").eq("wallet_id", walletId).eq("order_id", orderId).eq("category", category).maybeSingle();
  return Boolean(data);
}
async function loadOrderItemsLabel(supabase, orderId) {
  const { data: items } = await supabase.from("order_items").select("product_name").eq("order_id", orderId).limit(1);
  return items?.[0]?.product_name ?? "Order items";
}
async function creditOrderEarning(supabase, order, commissionRate) {
  if (order.payment_status !== "Paid" || !order.seller_id) return;
  const wallet = await getOrCreateSellerWallet(supabase, order.seller_id, commissionRate);
  if (!wallet) return;
  if (await hasTransaction(supabase, wallet.id, order.id, "order_earning")) return;
  const net = netEarning(Number(order.total), commissionRate);
  const productName = await loadOrderItemsLabel(supabase, order.id);
  const { error } = await supabase.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    order_id: order.id,
    type: "credit",
    category: "order_earning",
    amount: net,
    description: `Order ${order.order_number} \u2014 ${productName}`,
    is_released: false
  });
  if (error) return;
  await updateWalletBalances3(supabase, wallet.id, {
    total_earned: Number(wallet.total_earned) + net,
    held_balance: Number(wallet.held_balance) + net
  });
  if (order.status === "Delivered") {
    await releaseOrderEarning(supabase, order, commissionRate);
  }
}
async function releaseOrderEarning(supabase, order, commissionRate) {
  if (order.payment_status !== "Paid" || order.status !== "Delivered" || !order.seller_id) {
    return;
  }
  const wallet = await getOrCreateSellerWallet(supabase, order.seller_id, commissionRate);
  if (!wallet) return;
  if (await hasTransaction(supabase, wallet.id, order.id, "earning_release")) return;
  const { data: earning } = await supabase.from("wallet_transactions").select("*").eq("wallet_id", wallet.id).eq("order_id", order.id).eq("category", "order_earning").maybeSingle();
  if (!earning) {
    await creditOrderEarning(supabase, order, commissionRate);
    return;
  }
  const row = earning;
  if (row.is_released) return;
  const net = Number(row.amount);
  await supabase.from("wallet_transactions").update({ is_released: true }).eq("id", row.id);
  if (!await hasTransaction(supabase, wallet.id, order.id, "earning_release")) {
    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      order_id: order.id,
      type: "credit",
      category: "earning_release",
      amount: net,
      description: `Released \u2014 ${order.order_number}`,
      is_released: true
    });
  }
  const { data: fresh } = await supabase.from("seller_wallets").select("*").eq("id", wallet.id).single();
  if (!fresh) return;
  const w = fresh;
  await updateWalletBalances3(supabase, w.id, {
    held_balance: Math.max(0, Number(w.held_balance) - net),
    available_balance: Number(w.available_balance) + net
  });
}
async function reverseOrderEarning(supabase, order, commissionRate) {
  if (!order.seller_id) return;
  const wallet = await getOrCreateSellerWallet(supabase, order.seller_id, commissionRate);
  if (!wallet) return;
  const { data: earning } = await supabase.from("wallet_transactions").select("*").eq("wallet_id", wallet.id).eq("order_id", order.id).eq("category", "order_earning").maybeSingle();
  if (!earning) return;
  const row = earning;
  const net = Number(row.amount);
  if (await hasTransaction(supabase, wallet.id, order.id, "refund")) return;
  await supabase.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    order_id: order.id,
    type: "debit",
    category: "refund",
    amount: net,
    description: `Reversal \u2014 ${order.order_number}`,
    is_released: true
  });
  const { data: fresh } = await supabase.from("seller_wallets").select("*").eq("id", wallet.id).single();
  if (!fresh) return;
  const w = fresh;
  const patch = {
    total_earned: Math.max(0, Number(w.total_earned) - net)
  };
  if (row.is_released) {
    patch.available_balance = Math.max(0, Number(w.available_balance) - net);
  } else {
    patch.held_balance = Math.max(0, Number(w.held_balance) - net);
  }
  await updateWalletBalances3(supabase, w.id, patch);
}
async function syncSellerWalletFromOrders(supabase, sellerId, commissionRate) {
  const { data: orders } = await supabase.from("orders").select("id, order_number, seller_id, status, payment_status, total").eq("seller_id", sellerId);
  for (const order of orders ?? []) {
    if (order.payment_status === "Refunded" || order.status === "Cancelled") {
      await reverseOrderEarning(supabase, order, commissionRate);
      continue;
    }
    if (order.payment_status === "Paid") {
      await creditOrderEarning(supabase, order, commissionRate);
      if (order.status === "Delivered") {
        await releaseOrderEarning(supabase, order, commissionRate);
      }
    }
  }
}
async function requestSellerPayout(supabase, sellerId, amount, commissionRate) {
  const wallet = await getOrCreateSellerWallet(supabase, sellerId, commissionRate);
  if (!wallet) return { error: "Wallet not found" };
  if (amount <= 0) return { error: "Invalid amount" };
  if (amount > Number(wallet.available_balance)) {
    return { error: "Insufficient available balance" };
  }
  const { data: payout, error: payoutError } = await supabase.from("seller_payouts").insert({
    wallet_id: wallet.id,
    amount,
    status: "Pending",
    notes: "Manual withdrawal \u2014 processed by Nature's Grace team within 3\u20137 business days"
  }).select().single();
  if (payoutError || !payout) {
    return { error: payoutError?.message ?? "Could not create payout" };
  }
  const { error: txnError } = await supabase.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    payout_id: payout.id,
    type: "debit",
    category: "payout",
    amount,
    description: "Payout to Bank Account (pending)",
    is_released: true
  });
  if (txnError) {
    await supabase.from("seller_payouts").delete().eq("id", payout.id);
    return { error: txnError.message };
  }
  await updateWalletBalances3(supabase, wallet.id, {
    available_balance: Number(wallet.available_balance) - amount,
    pending_payout: Number(wallet.pending_payout) + amount
  });
  return { payoutId: payout.id };
}
async function verifySellerPayoutOwnership(supabase, payoutId, profileId) {
  const { data: payout } = await supabase.from("seller_payouts").select("wallet_id").eq("id", payoutId).maybeSingle();
  if (!payout?.wallet_id) return false;
  const { data: wallet } = await supabase.from("seller_wallets").select("seller_id").eq("id", payout.wallet_id).maybeSingle();
  if (!wallet?.seller_id) return false;
  const { data: seller } = await supabase.from("sellers").select("profile_id").eq("id", wallet.seller_id).maybeSingle();
  return seller?.profile_id === profileId;
}
async function resolveSellerIdForProfile(supabase, profileId) {
  const { data } = await supabase.from("sellers").select("id").eq("profile_id", profileId).maybeSingle();
  return data?.id ?? null;
}

// server/lib/payoutDev.ts
function devAutoCompleteEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.PAYOUT_DEV_AUTO_COMPLETE === "true" || process.env.PAYOUT_DEV_AUTO_COMPLETE === "1";
}

// server/routes/payouts.ts
function paramId(value) {
  return Array.isArray(value) ? value[0] : value;
}
async function handleDispatch(req, res) {
  try {
    const user = await getBearerUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const payoutId = paramId(req.params.payoutId);
    const supabase = requireSupabaseAdmin();
    const payout = await getPayoutById(supabase, payoutId);
    if (!payout) {
      return res.status(404).json({ error: "Payout not found" });
    }
    const ownsPayout = await verifySellerPayoutOwnership(supabase, payoutId, user.id);
    if (!ownsPayout) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (payout.status !== "Pending") {
      return res.status(200).json({
        payoutId: payout.id,
        status: payout.status,
        message: "Payout already dispatched"
      });
    }
    if (isRazorpayConfigured()) {
      const result = await createRazorpayPayout({
        referenceId: payout.id,
        amountInr: Number(payout.amount),
        fundAccountId: payout.razorpay_fund_account_id ?? void 0,
        narration: "NG seller payout"
      });
      if (!result.ok) {
        return res.status(502).json({ error: result.error });
      }
      await markPayoutProcessing(supabase, payoutId, {
        razorpayPayoutId: result.payoutId,
        razorpayFundAccountId: result.fundAccountId,
        notes: "Submitted to RazorpayX"
      });
      const normalized = (result.status ?? "").toLowerCase();
      if (normalized === "processed") {
        const done = await completePayout(supabase, payoutId, {
          razorpayPayoutId: result.payoutId,
          razorpayFundAccountId: result.fundAccountId
        });
        return res.json({
          payoutId: done.id,
          status: done.status,
          razorpayPayoutId: done.razorpay_payout_id
        });
      }
      return res.json({
        payoutId,
        status: "Processing",
        razorpayPayoutId: result.payoutId,
        message: "Payout submitted to RazorpayX"
      });
    }
    if (devAutoCompleteEnabled()) {
      const done = await completePayout(supabase, payoutId, {
        notes: "Dev auto-complete (no RazorpayX keys)",
        webhookEvent: "dev.auto_complete"
      });
      return res.json({
        payoutId: done.id,
        status: done.status,
        message: "Payout auto-completed (dev mode)",
        devMode: true
      });
    }
    return res.json({
      payoutId,
      status: "Pending",
      message: "Payout queued. Configure RAZORPAYX_* keys or set PAYOUT_DEV_AUTO_COMPLETE=true for local testing.",
      razorpayConfigured: false
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dispatch failed";
    console.error("[payouts] dispatch:", err);
    return res.status(500).json({ error: message });
  }
}
async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.header("x-razorpay-signature");
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
    const payload = req.body;
    const event = payload.event ?? "unknown";
    const entity = payload.payload?.payout?.entity ?? {};
    const supabase = requireSupabaseAdmin();
    const result = await applyRazorpayPayoutStatus(supabase, entity, event) ?? await applyRazorpayPayoutStatus2(supabase, entity, event);
    if (!result) {
      return res.status(200).json({ received: true, matched: false });
    }
    return res.status(200).json({
      received: true,
      matched: true,
      payoutId: result.payoutId,
      status: result.status,
      entity: "seller_or_practitioner"
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    console.error("[payouts] webhook:", err);
    return res.status(500).json({ error: message });
  }
}
async function handleDevComplete(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const user = await getBearerUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const supabase = requireSupabaseAdmin();
    const ownsPayout = await verifySellerPayoutOwnership(
      supabase,
      paramId(req.params.payoutId),
      user.id
    );
    if (!ownsPayout) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const done = await completePayout(supabase, paramId(req.params.payoutId), {
      webhookEvent: "dev.manual_complete"
    });
    return res.json({ payoutId: done.id, status: done.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Complete failed";
    return res.status(500).json({ error: message });
  }
}
function registerPayoutRoutes(app2) {
  app2.post("/api/payouts/:payoutId/dispatch", handleDispatch);
  app2.post("/api/payouts/:payoutId/dev-complete", handleDevComplete);
  app2.post("/api/webhooks/razorpayx", handleRazorpayWebhook);
}

// server/services/practitionerWalletLedger.ts
function netEarning2(gross, commissionRate) {
  return Math.round(gross * (1 - commissionRate / 100) * 100) / 100;
}
async function getOrCreatePractitionerWallet(supabase, practitionerId, commissionRate) {
  const { data: existing } = await supabase.from("practitioner_wallets").select("*").eq("practitioner_id", practitionerId).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from("practitioner_wallets").insert({
    practitioner_id: practitionerId,
    commission_rate: commissionRate,
    bank_account_label: null,
    next_payout_date: null
  }).select().single();
  if (error || !data) return null;
  return data;
}
async function updateWallet(supabase, walletId, patch) {
  await supabase.from("practitioner_wallets").update(patch).eq("id", walletId);
}
async function hasTxn(supabase, walletId, bookingId, category) {
  const { data } = await supabase.from("practitioner_wallet_transactions").select("id").eq("wallet_id", walletId).eq("booking_id", bookingId).eq("category", category).maybeSingle();
  return Boolean(data);
}
async function creditBookingEarning(supabase, booking, commissionRate) {
  if (booking.payment_status !== "Paid" || !booking.practitioner_id) return;
  const wallet = await getOrCreatePractitionerWallet(
    supabase,
    booking.practitioner_id,
    commissionRate
  );
  if (!wallet) return;
  if (await hasTxn(supabase, wallet.id, booking.id, "booking_earning")) return;
  const net = netEarning2(Number(booking.amount), commissionRate);
  await supabase.from("practitioner_wallet_transactions").insert({
    wallet_id: wallet.id,
    booking_id: booking.id,
    type: "credit",
    category: "booking_earning",
    amount: net,
    description: `Session ${booking.booking_number} \u2014 ${booking.service_name}`,
    is_released: false
  });
  await updateWallet(supabase, wallet.id, {
    total_earned: Number(wallet.total_earned) + net,
    held_balance: Number(wallet.held_balance) + net
  });
  if (booking.booking_status === "Completed") {
    await releaseBookingEarning(supabase, booking, commissionRate);
  }
}
async function releaseBookingEarning(supabase, booking, commissionRate) {
  if (booking.payment_status !== "Paid" || booking.booking_status !== "Completed" || !booking.practitioner_id) {
    return;
  }
  const wallet = await getOrCreatePractitionerWallet(
    supabase,
    booking.practitioner_id,
    commissionRate
  );
  if (!wallet) return;
  if (await hasTxn(supabase, wallet.id, booking.id, "earning_release")) return;
  const { data: earning } = await supabase.from("practitioner_wallet_transactions").select("*").eq("wallet_id", wallet.id).eq("booking_id", booking.id).eq("category", "booking_earning").maybeSingle();
  if (!earning) {
    await creditBookingEarning(supabase, booking, commissionRate);
    return;
  }
  const row = earning;
  if (row.is_released) return;
  const net = Number(row.amount);
  await supabase.from("practitioner_wallet_transactions").update({ is_released: true }).eq("id", row.id);
  await supabase.from("practitioner_wallet_transactions").insert({
    wallet_id: wallet.id,
    booking_id: booking.id,
    type: "credit",
    category: "earning_release",
    amount: net,
    description: `Released \u2014 ${booking.booking_number}`,
    is_released: true
  });
  const { data: fresh } = await supabase.from("practitioner_wallets").select("*").eq("id", wallet.id).single();
  if (!fresh) return;
  const w = fresh;
  await updateWallet(supabase, w.id, {
    held_balance: Math.max(0, Number(w.held_balance) - net),
    available_balance: Number(w.available_balance) + net
  });
}
async function reverseBookingEarning(supabase, booking, commissionRate) {
  if (!booking.practitioner_id) return;
  const wallet = await getOrCreatePractitionerWallet(
    supabase,
    booking.practitioner_id,
    commissionRate
  );
  if (!wallet) return;
  const { data: earning } = await supabase.from("practitioner_wallet_transactions").select("*").eq("wallet_id", wallet.id).eq("booking_id", booking.id).eq("category", "booking_earning").maybeSingle();
  if (!earning) return;
  const row = earning;
  const net = Number(row.amount);
  if (await hasTxn(supabase, wallet.id, booking.id, "refund")) return;
  await supabase.from("practitioner_wallet_transactions").insert({
    wallet_id: wallet.id,
    booking_id: booking.id,
    type: "debit",
    category: "refund",
    amount: net,
    description: `Reversal \u2014 ${booking.booking_number}`,
    is_released: true
  });
  const { data: fresh } = await supabase.from("practitioner_wallets").select("*").eq("id", wallet.id).single();
  if (!fresh) return;
  const w = fresh;
  const patch = {
    total_earned: Math.max(0, Number(w.total_earned) - net)
  };
  if (row.is_released) {
    patch.available_balance = Math.max(0, Number(w.available_balance) - net);
  } else {
    patch.held_balance = Math.max(0, Number(w.held_balance) - net);
  }
  await updateWallet(supabase, w.id, patch);
}
async function syncPractitionerWalletFromBookings(supabase, practitionerId, commissionRate) {
  const { data: bookings } = await supabase.from("practitioner_bookings").select(
    "id, booking_number, practitioner_id, booking_status, payment_status, amount, service_name"
  ).eq("practitioner_id", practitionerId);
  for (const row of bookings ?? []) {
    if (row.payment_status === "Refunded" || row.booking_status === "Cancelled") {
      await reverseBookingEarning(supabase, row, commissionRate);
      continue;
    }
    if (row.payment_status === "Paid") {
      await creditBookingEarning(supabase, row, commissionRate);
      if (row.booking_status === "Completed") {
        await releaseBookingEarning(supabase, row, commissionRate);
      }
    }
  }
}
async function requestPractitionerPayout(supabase, practitionerId, amount, commissionRate) {
  const wallet = await getOrCreatePractitionerWallet(
    supabase,
    practitionerId,
    commissionRate
  );
  if (!wallet) return { error: "Wallet not found" };
  if (amount <= 0) return { error: "Invalid amount" };
  if (amount > Number(wallet.available_balance)) {
    return { error: "Insufficient available balance" };
  }
  const { data: payout, error: payoutError } = await supabase.from("practitioner_payouts").insert({
    wallet_id: wallet.id,
    amount,
    status: "Pending",
    notes: "Manual withdrawal \u2014 processed by Nature's Grace team within 3\u20137 business days"
  }).select().single();
  if (payoutError || !payout) {
    return { error: payoutError?.message ?? "Could not create payout" };
  }
  const { error: txnError } = await supabase.from("practitioner_wallet_transactions").insert({
    wallet_id: wallet.id,
    payout_id: payout.id,
    type: "debit",
    category: "payout",
    amount,
    description: "Payout to Bank Account (pending)",
    is_released: true
  });
  if (txnError) {
    await supabase.from("practitioner_payouts").delete().eq("id", payout.id);
    return { error: txnError.message };
  }
  await updateWallet(supabase, wallet.id, {
    available_balance: Number(wallet.available_balance) - amount,
    pending_payout: Number(wallet.pending_payout) + amount
  });
  return { payoutId: payout.id };
}
async function verifyPractitionerPayoutOwnership(supabase, payoutId, profileId) {
  const { data: payout } = await supabase.from("practitioner_payouts").select("wallet_id").eq("id", payoutId).maybeSingle();
  if (!payout?.wallet_id) return false;
  const { data: wallet } = await supabase.from("practitioner_wallets").select("practitioner_id").eq("id", payout.wallet_id).maybeSingle();
  if (!wallet?.practitioner_id) return false;
  const { data: practitioner } = await supabase.from("practitioners").select("profile_id").eq("id", wallet.practitioner_id).maybeSingle();
  return practitioner?.profile_id === profileId;
}
async function resolvePractitionerIdForProfile(supabase, profileId) {
  const { data } = await supabase.from("practitioners").select("id").eq("profile_id", profileId).maybeSingle();
  return data?.id ?? null;
}
function calculateSessionPrice(pricePerSession, durationMinutes) {
  const pricePerMinute = pricePerSession / 60;
  return Math.round(pricePerMinute * durationMinutes);
}
async function createPaidBooking(supabase, input) {
  const bookingNumber = `BK-${Date.now().toString(36).toUpperCase()}`;
  const { data: practitioner } = await supabase.from("practitioners").select("meeting_link").eq("id", input.practitionerId).maybeSingle();
  const { data, error } = await supabase.from("practitioner_bookings").insert({
    booking_number: bookingNumber,
    practitioner_id: input.practitionerId,
    offering_id: input.offeringId ?? null,
    user_id: input.userId,
    client_name: input.clientName,
    client_email: input.clientEmail ?? null,
    service_name: input.serviceName,
    session_date: input.sessionDate,
    session_time: input.sessionTime,
    duration_minutes: input.durationMinutes,
    amount: input.amount,
    booking_status: "Confirmed",
    payment_status: "Paid",
    razorpay_payment_id: input.razorpayPaymentId,
    notes: input.notes ?? null,
    meeting_link: practitioner?.meeting_link ?? null
  }).select("id, booking_number, practitioner_id, booking_status, payment_status, amount, service_name").single();
  if (error || !data) {
    return { error: error?.message ?? "Could not create booking" };
  }
  return { bookingId: data.id, bookingNumber: data.booking_number };
}

// server/routes/practitionerPayouts.ts
function paramId2(value) {
  return Array.isArray(value) ? value[0] : value;
}
async function handleDispatch2(req, res) {
  try {
    const user = await getBearerUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const payoutId = paramId2(req.params.payoutId);
    const supabase = requireSupabaseAdmin();
    const payout = await getPayoutById2(supabase, payoutId);
    if (!payout) return res.status(404).json({ error: "Payout not found" });
    const ownsPayout = await verifyPractitionerPayoutOwnership(supabase, payoutId, user.id);
    if (!ownsPayout) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (payout.status !== "Pending") {
      return res.status(200).json({
        payoutId: payout.id,
        status: payout.status,
        message: "Payout already dispatched"
      });
    }
    if (isRazorpayConfigured()) {
      const result = await createRazorpayPayout({
        referenceId: payout.id,
        amountInr: Number(payout.amount),
        fundAccountId: payout.razorpay_fund_account_id ?? void 0,
        narration: "NG practitioner payout"
      });
      if (!result.ok) return res.status(502).json({ error: result.error });
      await markPayoutProcessing2(supabase, payoutId, {
        razorpayPayoutId: result.payoutId,
        razorpayFundAccountId: result.fundAccountId,
        notes: "Submitted to RazorpayX"
      });
      if ((result.status ?? "").toLowerCase() === "processed") {
        const done = await completePayout2(supabase, payoutId, {
          razorpayPayoutId: result.payoutId,
          razorpayFundAccountId: result.fundAccountId
        });
        return res.json({
          payoutId: done.id,
          status: done.status,
          razorpayPayoutId: done.razorpay_payout_id
        });
      }
      return res.json({
        payoutId,
        status: "Processing",
        razorpayPayoutId: result.payoutId,
        message: "Payout submitted to RazorpayX"
      });
    }
    if (devAutoCompleteEnabled()) {
      const done = await completePayout2(supabase, payoutId, {
        notes: "Dev auto-complete (no RazorpayX keys)",
        webhookEvent: "dev.auto_complete"
      });
      return res.json({
        payoutId: done.id,
        status: done.status,
        message: "Payout auto-completed (dev mode)",
        devMode: true
      });
    }
    return res.json({
      payoutId,
      status: "Pending",
      message: "Payout queued. Configure RAZORPAYX_* or PAYOUT_DEV_AUTO_COMPLETE.",
      razorpayConfigured: false
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dispatch failed";
    console.error("[practitioner-payouts] dispatch:", err);
    return res.status(500).json({ error: message });
  }
}
function registerPractitionerPayoutRoutes(app2) {
  app2.post("/api/practitioner-payouts/:payoutId/dispatch", handleDispatch2);
}

// server/services/razorpayCheckout.ts
import crypto2 from "node:crypto";
function getAuthHeader2() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAYX_KEY_SECRET;
  if (!keyId?.trim() || !keySecret?.trim()) return null;
  const token = Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString("base64");
  return `Basic ${token}`;
}
function isProduction() {
  return process.env.NODE_ENV === "production";
}
async function createBookingOrder(params) {
  const auth = getAuthHeader2();
  const amountPaise = Math.round(params.amountInr * 100);
  if (amountPaise < 100) {
    return { ok: false, error: "Amount below minimum (Rs. 1)" };
  }
  if (!auth) {
    if (isProduction()) {
      return { ok: false, error: "Razorpay is not configured" };
    }
    const orderId = `order_dev_${params.receipt}`;
    return {
      ok: true,
      orderId,
      amountPaise,
      currency: "INR",
      devMode: true
    };
  }
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: params.receipt.slice(0, 40),
        notes: params.notes ?? {}
      })
    });
    const json = await res.json();
    if (!res.ok || !json.id) {
      return {
        ok: false,
        error: json.error?.description ?? `Razorpay orders HTTP ${res.status}`
      };
    }
    return {
      ok: true,
      orderId: json.id,
      amountPaise,
      currency: "INR"
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Order creation failed"
    };
  }
}
function verifyPaymentSignature(params) {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAYX_KEY_SECRET;
  if (!secret?.trim()) return false;
  const body = `${params.orderId}|${params.paymentId}`;
  const expected = crypto2.createHmac("sha256", secret.trim()).update(body).digest("hex");
  try {
    return crypto2.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
  } catch {
    return expected === params.signature;
  }
}
async function confirmBookingPayment(params) {
  if (params.devMode || params.orderId.startsWith("order_dev_")) {
    if (isProduction()) {
      return { ok: false, error: "Dev payment mode is disabled in production" };
    }
    const paymentId = params.paymentId || `pay_dev_${Date.now()}`;
    return { ok: true, paymentId, orderId: params.orderId };
  }
  if (!params.paymentId) {
    return { ok: false, error: "paymentId is required" };
  }
  if (!params.signature || !verifyPaymentSignature(params)) {
    return { ok: false, error: "Invalid payment signature" };
  }
  return { ok: true, paymentId: params.paymentId, orderId: params.orderId };
}

// server/services/userNotifications.ts
async function insertUserNotification(supabase, params) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    message: params.message,
    is_read: false,
    link_route: params.linkRoute ?? null,
    link_target_id: params.linkTargetId ?? null
  });
  if (error) {
    console.error("[userNotifications] insert:", error.message);
  }
}

// server/services/email/templates.ts
var BRAND = "Nature's Grace";
function wrap(body) {
  return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;">
<p style="color:#013220;font-weight:bold;font-size:18px;">${BRAND}</p>
${body}
<p style="color:#888;font-size:12px;margin-top:32px;">This is an automated message from ${BRAND}. Please do not reply directly to this email.</p>
</body></html>`;
}
function buildEmail(templateId, to, vars) {
  const name = vars.name || "there";
  const templates = {
    account_created: {
      subject: `Welcome to ${BRAND}`,
      body: `<p>Hi ${name},</p><p>Your account has been created. We're glad you're here.</p><p>Complete your profile and explore wellness, community, and our store.</p>`
    },
    email_verified: {
      subject: "Your email is verified",
      body: `<p>Hi ${name},</p><p>Your email address has been verified. Your account is fully active.</p>`
    },
    password_changed: {
      subject: "Your password was changed",
      body: `<p>Hi ${name},</p><p>Your password was changed successfully. If you did not make this change, contact support immediately.</p>`
    },
    password_reset_requested: {
      subject: "Reset your password",
      body: `<p>Hi ${name},</p><p>We received a request to reset your password. Use the link in the app or email we sent to choose a new password.</p>`
    },
    booking_confirmed: {
      subject: "Session booking confirmed",
      body: `<p>Hi ${name},</p><p>Your session with <strong>${vars.practitioner ?? "your practitioner"}</strong> is confirmed.</p><p><strong>Date:</strong> ${vars.date ?? ""}<br/><strong>Time:</strong> ${vars.time ?? ""}<br/><strong>Service:</strong> ${vars.service ?? ""}</p>`
    },
    booking_cancelled: {
      subject: "Session booking cancelled",
      body: `<p>Hi ${name},</p><p>Your session scheduled for ${vars.date ?? ""} at ${vars.time ?? ""} has been cancelled.</p><p>${vars.refundNote ?? "Refund eligibility depends on our cancellation policy."}</p>`
    },
    booking_reminder: {
      subject: "Reminder: upcoming session",
      body: `<p>Hi ${name},</p><p>This is a reminder for your session with <strong>${vars.practitioner ?? ""}</strong> on ${vars.date ?? ""} at ${vars.time ?? ""}.</p>`
    },
    practitioner_application_submitted: {
      subject: "Practitioner application received",
      body: `<p>Hi ${name},</p><p>We've received your practitioner application. Our team typically reviews applications within 5\u20137 business days.</p>`
    },
    practitioner_approved: {
      subject: "Practitioner application approved",
      body: `<p>Hi ${name},</p><p>Congratulations! Your practitioner application has been approved. Sign in to access your practitioner dashboard.</p>`
    },
    practitioner_rejected: {
      subject: "Practitioner application update",
      body: `<p>Hi ${name},</p><p>Thank you for applying. We were unable to approve your application at this time.</p><p><strong>Reason:</strong> ${vars.reason ?? "Please contact support for details."}</p><p>You may reapply with updated information from the app.</p>`
    },
    seller_application_submitted: {
      subject: "Seller application received",
      body: `<p>Hi ${name},</p><p>We've received your seller application. Our team typically reviews applications within 5\u20137 business days.</p>`
    },
    seller_approved: {
      subject: "Seller application approved",
      body: `<p>Hi ${name},</p><p>Your seller application has been approved. Sign in to list products and manage your store.</p>`
    },
    seller_rejected: {
      subject: "Seller application update",
      body: `<p>Hi ${name},</p><p>We were unable to approve your seller application at this time.</p><p><strong>Reason:</strong> ${vars.reason ?? "Please contact support for details."}</p><p>You may reapply with updated information from the app.</p>`
    },
    order_confirmed: {
      subject: `Order ${vars.orderNumber ?? ""} confirmed`,
      body: `<p>Hi ${name},</p><p>Thank you for your order <strong>${vars.orderNumber ?? ""}</strong>.</p><p><strong>Total:</strong> ${vars.total ?? ""}</p><p>We'll notify you when your order ships.</p>`
    },
    order_cancelled: {
      subject: `Order ${vars.orderNumber ?? ""} cancelled`,
      body: `<p>Hi ${name},</p><p>Your order <strong>${vars.orderNumber ?? ""}</strong> has been cancelled.</p><p>${vars.refundNote ?? ""}</p>`
    },
    order_shipped: {
      subject: `Order ${vars.orderNumber ?? ""} shipped`,
      body: `<p>Hi ${name},</p><p>Your order has been shipped.</p><p><strong>Courier:</strong> ${vars.courier ?? "\u2014"}<br/><strong>Tracking:</strong> ${vars.tracking ?? "\u2014"}</p>`
    },
    order_delivered: {
      subject: `Order ${vars.orderNumber ?? ""} delivered`,
      body: `<p>Hi ${name},</p><p>Your order <strong>${vars.orderNumber ?? ""}</strong> has been delivered. We hope you enjoy your purchase.</p>`
    },
    refund_approved: {
      subject: "Refund approved",
      body: `<p>Hi ${name},</p><p>Your refund request has been approved.</p><p><strong>Amount:</strong> ${vars.amount ?? ""}<br/><strong>Reference:</strong> ${vars.reference ?? ""}</p><p>Funds may take 5\u201310 business days to appear depending on your bank.</p>`
    },
    withdrawal_received: {
      subject: "Withdrawal request received",
      body: `<p>Hi ${name},</p><p>We received your withdrawal request for <strong>${vars.amount ?? ""}</strong>.</p><p>Requests are processed manually by our team within 3\u20137 business days.</p>`
    },
    withdrawal_completed: {
      subject: "Withdrawal completed",
      body: `<p>Hi ${name},</p><p>Your withdrawal of <strong>${vars.amount ?? ""}</strong> has been processed and sent to your registered bank account.</p>`
    },
    account_deletion_requested: {
      subject: "Account deletion request received",
      body: `<p>Hi ${name},</p><p>We received your request to delete your ${BRAND} account.</p><p>Pending orders, payouts, or legal holds may delay processing. We will email you when deletion is complete.</p>`
    }
  };
  const t = templates[templateId];
  const html = wrap(t.body);
  const text = t.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { to, subject: t.subject, html, text };
}

// server/services/email/emailService.ts
async function sendTransactionalEmail(templateId, to, vars = {}) {
  if (!to?.trim()) {
    return { ok: false, error: "Missing recipient email" };
  }
  const payload = buildEmail(templateId, to.trim(), vars);
  const provider = (process.env.EMAIL_PROVIDER ?? "").toLowerCase();
  if (!provider) {
    console.log(`[email] (not configured) ${templateId} \u2192 ${to}: ${payload.subject}`);
    return { ok: true, skipped: true };
  }
  try {
    if (provider === "resend") {
      return await sendViaResend(payload);
    }
    if (provider === "smtp") {
      return await sendViaSmtp(payload);
    }
    return { ok: false, error: `Unknown EMAIL_PROVIDER: ${provider}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error(`[email] ${templateId}:`, message);
    return { ok: false, error: message };
  }
}
async function sendViaResend(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Nature's Grace <noreply@naturesgrace.app>";
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    })
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body || `Resend HTTP ${res.status}` };
  }
  return { ok: true };
}
async function sendViaSmtp(payload) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM ?? user;
  if (!host || !user || !pass) {
    return { ok: false, error: "SMTP_HOST, SMTP_USER, SMTP_PASS required" };
  }
  console.log(`[email:smtp] Would send to ${payload.to} via ${host}:${port}`);
  console.log(`[email:smtp] Subject: ${payload.subject}`);
  console.log(
    "[email:smtp] Configure RESEND_API_KEY for production, or install nodemailer for raw SMTP."
  );
  return { ok: true, skipped: true };
}
async function sendEmailToUserId(supabase, userId, templateId, vars = {}) {
  const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
  const email = profile?.email;
  if (!email) return { ok: false, error: "User email not found" };
  const name = profile?.full_name?.split(" ")[0] ?? "there";
  return sendTransactionalEmail(templateId, email, { name, ...vars });
}

// server/services/notificationDispatch.ts
var EVENT_CATEGORY = {
  booking_reminder: "booking_reminders",
  booking_confirmed: "booking_reminders",
  booking_cancelled: "booking_reminders",
  order_confirmed: "order_updates",
  order_shipped: "order_updates",
  order_delivered: "order_updates",
  practitioner_approved: "platform_announcements",
  seller_approved: "platform_announcements",
  application_rejected: "platform_announcements",
  refund_approved: "order_updates",
  withdrawal_received: "order_updates",
  withdrawal_completed: "order_updates",
  application_submitted: "platform_announcements"
};
var EVENT_EMAIL = {
  booking_reminder: "booking_reminder",
  booking_confirmed: "booking_confirmed",
  booking_cancelled: "booking_cancelled",
  order_confirmed: "order_confirmed",
  order_shipped: "order_shipped",
  order_delivered: "order_delivered",
  practitioner_approved: "practitioner_approved",
  seller_approved: "seller_approved",
  application_rejected: "practitioner_rejected",
  refund_approved: "refund_approved",
  withdrawal_received: "withdrawal_received",
  withdrawal_completed: "withdrawal_completed"
};
function parsePrefs(raw) {
  if (!raw || typeof raw !== "object") return {};
  return raw;
}
function categoryAllowed(prefs, category) {
  if (prefs.notificationsEnabled === false) return false;
  switch (category) {
    case "booking_reminders":
      return prefs.bookingReminders !== false;
    case "order_updates":
      return prefs.orderUpdates !== false;
    case "community_activity":
      return prefs.communityActivity !== false;
    case "promotions":
      return prefs.promotions !== false;
    case "platform_announcements":
      return prefs.platformAnnouncements !== false;
    default:
      return true;
  }
}
async function dispatchUserNotification(supabase, params) {
  const { data: profile } = await supabase.from("profiles").select("preferences, email, full_name").eq("id", params.userId).maybeSingle();
  const prefs = parsePrefs(profile?.preferences);
  const category = EVENT_CATEGORY[params.event];
  if (categoryAllowed(prefs, category)) {
    await insertUserNotification(supabase, {
      userId: params.userId,
      message: params.message,
      linkRoute: params.linkRoute ?? null,
      linkTargetId: params.linkTargetId ?? null
    });
  }
  const emailTemplate = params.emailTemplateOverride ?? EVENT_EMAIL[params.event];
  if (emailTemplate && categoryAllowed(prefs, category)) {
    await sendEmailToUserId(supabase, params.userId, emailTemplate, params.emailVars ?? {});
  }
  const { data: tokens } = await supabase.from("push_tokens").select("token, platform").eq("user_id", params.userId);
  if (tokens?.length && process.env.EXPO_ACCESS_TOKEN && categoryAllowed(prefs, category)) {
    for (const row of tokens) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            to: row.token,
            title: "Nature's Grace",
            body: params.message,
            data: {
              linkRoute: params.linkRoute,
              linkTargetId: params.linkTargetId
            }
          })
        });
      } catch (err) {
        console.warn("[push] send failed:", err);
      }
    }
  }
}

// server/services/platformSettings.ts
var DEFAULT_COMMISSION_RATE = 12;
async function fetchCommissionRate(supabase) {
  const { data } = await supabase.from("platform_settings").select("settings").eq("id", "default").maybeSingle();
  const settings = data?.settings;
  const raw = settings?.commissionRate;
  const rate = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : DEFAULT_COMMISSION_RATE;
}

// server/services/bookingFulfillment.ts
async function savePendingBookingCheckout(supabase, userId, razorpayOrderId, booking) {
  await supabase.from("pending_booking_checkouts").upsert(
    {
      user_id: userId,
      razorpay_order_id: razorpayOrderId,
      booking_draft: booking,
      fulfilled_at: null,
      booking_id: null
    },
    { onConflict: "razorpay_order_id" }
  );
}
async function fulfillBookingPayment(params) {
  const { supabase, userId, razorpayOrderId, paymentId } = params;
  const { data: pending } = await supabase.from("pending_booking_checkouts").select("*").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
  if (pending?.fulfilled_at && pending.booking_id) {
    const { data: existing } = await supabase.from("practitioner_bookings").select("id, booking_number").eq("id", pending.booking_id).maybeSingle();
    if (existing) {
      return {
        ok: true,
        bookingId: existing.id,
        bookingNumber: existing.booking_number,
        alreadyPaid: true
      };
    }
  }
  const draft = params.booking ?? pending?.booking_draft;
  if (!draft) {
    return { ok: false, error: "Booking draft not found for payment" };
  }
  if (pending?.user_id && pending.user_id !== userId) {
    return { ok: false, error: "Checkout does not belong to this account" };
  }
  const { data: dup } = await supabase.from("practitioner_bookings").select("id, booking_number").eq("razorpay_payment_id", paymentId).maybeSingle();
  if (dup) {
    return {
      ok: true,
      bookingId: dup.id,
      bookingNumber: dup.booking_number,
      alreadyPaid: true
    };
  }
  const created = await createPaidBooking(supabase, {
    practitionerId: draft.practitionerId,
    offeringId: draft.offeringId,
    userId,
    clientName: draft.clientName,
    clientEmail: draft.clientEmail,
    serviceName: draft.serviceName,
    sessionDate: draft.sessionDate,
    sessionTime: draft.sessionTime,
    durationMinutes: Number(draft.durationMinutes),
    amount: Number(draft.amountInr),
    razorpayPaymentId: paymentId,
    notes: draft.notes
  });
  if ("error" in created) {
    return { ok: false, error: created.error };
  }
  const commissionRate = params.commissionRate ?? await fetchCommissionRate(supabase);
  const { data: bookingRow } = await supabase.from("practitioner_bookings").select(
    "id, booking_number, practitioner_id, booking_status, payment_status, amount, service_name"
  ).eq("id", created.bookingId).single();
  if (bookingRow) {
    await creditBookingEarning(
      supabase,
      bookingRow,
      commissionRate
    );
    await dispatchUserNotification(supabase, {
      userId,
      event: "booking_confirmed",
      message: `Session booked: ${draft.serviceName} on ${draft.sessionDate}.`,
      linkRoute: "SessionDetail",
      linkTargetId: created.bookingId,
      emailVars: {
        practitioner: draft.serviceName,
        date: draft.sessionDate,
        time: draft.sessionTime,
        service: draft.serviceName
      }
    });
  }
  await supabase.from("pending_booking_checkouts").update({
    fulfilled_at: (/* @__PURE__ */ new Date()).toISOString(),
    booking_id: created.bookingId
  }).eq("razorpay_order_id", razorpayOrderId);
  return {
    ok: true,
    bookingId: created.bookingId,
    bookingNumber: created.bookingNumber,
    alreadyPaid: false
  };
}

// server/routes/bookingCheckout.ts
async function validateBookingAmount(practitionerId, durationMinutes, amountInr, offeringId) {
  const supabase = requireSupabaseAdmin();
  if (offeringId) {
    const { data: offering, error: error2 } = await supabase.from("practitioner_offerings").select("practitioner_id, duration_minutes, price, is_active").eq("id", offeringId).maybeSingle();
    if (error2 || !offering) {
      return { ok: false, error: "Session offering not found" };
    }
    if (offering.practitioner_id !== practitionerId) {
      return { ok: false, error: "Offering does not belong to this practitioner" };
    }
    if (!offering.is_active) {
      return { ok: false, error: "This session offering is no longer available" };
    }
    if (Number(offering.duration_minutes) !== durationMinutes) {
      return { ok: false, error: "Duration does not match selected offering" };
    }
    const expected2 = Number(offering.price);
    if (Math.abs(expected2 - amountInr) > 0.01) {
      return { ok: false, error: "Booking amount does not match offering price" };
    }
    return { ok: true, amountInr: expected2 };
  }
  const { data: practitioner, error } = await supabase.from("practitioners").select("price_per_session").eq("id", practitionerId).maybeSingle();
  if (error || !practitioner) {
    return { ok: false, error: "Practitioner not found" };
  }
  const expected = calculateSessionPrice(
    Number(practitioner.price_per_session),
    durationMinutes
  );
  if (Math.abs(expected - amountInr) > 0.01) {
    return { ok: false, error: "Booking amount does not match practitioner pricing" };
  }
  return { ok: true, amountInr: expected };
}
async function handleCreateOrder(req, res) {
  try {
    const user = await requireBearerUser(req, res);
    if (!user) return;
    const body = req.body;
    if (!body.practitionerId || !body.durationMinutes || !body.amountInr) {
      return res.status(400).json({
        error: "practitionerId, durationMinutes, and amountInr are required"
      });
    }
    const validated = await validateBookingAmount(
      body.practitionerId,
      Number(body.durationMinutes),
      Number(body.amountInr),
      body.offeringId ?? body.booking?.offeringId
    );
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }
    const result = await createBookingOrder({
      amountInr: validated.amountInr,
      receipt: body.receipt ?? `bk_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        practitioner_id: body.practitionerId,
        user_id: user.id
      }
    });
    if (!result.ok) {
      return res.status(502).json({ error: result.error });
    }
    if (body.booking) {
      const supabase = requireSupabaseAdmin();
      await savePendingBookingCheckout(
        supabase,
        user.id,
        result.orderId,
        { ...body.booking, amountInr: validated.amountInr }
      );
    }
    const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? process.env.RAZORPAYX_KEY_ID?.trim() ?? null;
    return res.json({
      orderId: result.orderId,
      amountPaise: result.amountPaise,
      amountInr: validated.amountInr,
      currency: result.currency,
      devMode: result.devMode ?? false,
      keyId
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create order failed";
    return res.status(500).json({ error: message });
  }
}
async function handleConfirmPayment(req, res) {
  try {
    const user = await requireBearerUser(req, res);
    if (!user) return;
    const { orderId, paymentId, signature, devMode, booking } = req.body;
    if (!orderId || !booking) {
      return res.status(400).json({ error: "orderId and booking are required" });
    }
    const validated = await validateBookingAmount(
      booking.practitionerId,
      Number(booking.durationMinutes),
      Number(booking.amountInr),
      booking.offeringId
    );
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }
    const verified = await confirmBookingPayment({
      orderId,
      paymentId: paymentId ?? "",
      signature,
      devMode
    });
    if (!verified.ok) {
      return res.status(400).json({ error: verified.error });
    }
    const supabase = requireSupabaseAdmin();
    const commissionRate = await fetchCommissionRate(supabase);
    const created = await fulfillBookingPayment({
      supabase,
      userId: user.id,
      razorpayOrderId: orderId,
      paymentId: verified.paymentId,
      booking: { ...booking, amountInr: validated.amountInr },
      commissionRate
    });
    if (!created.ok) {
      return res.status(500).json({ error: created.error });
    }
    return res.json({
      paymentId: verified.paymentId,
      orderId: verified.orderId,
      bookingId: created.bookingId,
      bookingNumber: created.bookingNumber
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirm failed";
    return res.status(500).json({ error: message });
  }
}
function registerBookingCheckoutRoutes(app2) {
  app2.post("/api/bookings/checkout/create-order", handleCreateOrder);
  app2.post("/api/bookings/checkout/confirm", handleConfirmPayment);
}

// server/services/orderFulfillment.ts
async function decrementOrderStock(supabase, orderId) {
  const { data: items } = await supabase.from("order_items").select("product_id, quantity").eq("order_id", orderId);
  for (const item of items ?? []) {
    const productId = item.product_id;
    const qty = Number(item.quantity) || 0;
    if (!productId || qty <= 0) continue;
    const { data: product } = await supabase.from("products").select("stock").eq("id", productId).maybeSingle();
    if (!product) continue;
    const nextStock = Math.max(0, Number(product.stock) - qty);
    await supabase.from("products").update({ stock: nextStock }).eq("id", productId);
  }
}
async function restoreOrderStock(supabase, orderId) {
  const { data: items } = await supabase.from("order_items").select("product_id, quantity").eq("order_id", orderId);
  for (const item of items ?? []) {
    const productId = item.product_id;
    const qty = Number(item.quantity) || 0;
    if (!productId || qty <= 0) continue;
    const { data: product } = await supabase.from("products").select("stock").eq("id", productId).maybeSingle();
    if (!product) continue;
    const nextStock = Number(product.stock) + qty;
    await supabase.from("products").update({ stock: nextStock }).eq("id", productId);
  }
}
async function adjustPromoUsage(supabase, promoId, table, delta) {
  const { data: promoRow } = await supabase.from(table).select("usage_count").eq("id", promoId).maybeSingle();
  const current = promoRow?.usage_count;
  if (typeof current === "number") {
    await supabase.from(table).update({ usage_count: Math.max(0, current + delta) }).eq("id", promoId);
  }
}
async function restorePromoUsageOnRefund(supabase, order) {
  if (order.seller_promo_id) {
    await adjustPromoUsage(supabase, order.seller_promo_id, "seller_promos", -1);
  }
  if (order.platform_promo_id) {
    await adjustPromoUsage(supabase, order.platform_promo_id, "platform_promo_codes", -1);
  }
}
async function incrementPromoUsage(supabase, order) {
  const promoId = order.seller_promo_id;
  if (promoId) {
    const { data: promoRow } = await supabase.from("seller_promos").select("usage_count").eq("id", promoId).maybeSingle();
    const current = promoRow?.usage_count;
    if (typeof current === "number") {
      await supabase.from("seller_promos").update({ usage_count: current + 1 }).eq("id", promoId);
    }
  }
  const platId = order.platform_promo_id;
  if (platId) {
    const { data: platRow } = await supabase.from("platform_promo_codes").select("usage_count").eq("id", platId).maybeSingle();
    const pcur = platRow?.usage_count;
    if (typeof pcur === "number") {
      await supabase.from("platform_promo_codes").update({ usage_count: pcur + 1 }).eq("id", platId);
    }
  }
}
async function notifySellerNewOrder(supabase, order) {
  if (!order.seller_id) return;
  const { data: seller } = await supabase.from("sellers").select("profile_id").eq("id", order.seller_id).maybeSingle();
  const profileId = seller?.profile_id;
  if (!profileId) return;
  await dispatchUserNotification(supabase, {
    userId: profileId,
    event: "order_confirmed",
    message: `New paid order ${order.order_number} received.`,
    linkRoute: "SellerMain"
  });
}
async function fulfillStoreOrderPayment(params) {
  const { supabase, storeOrderId, razorpayOrderId, paymentId } = params;
  const { data: existing, error: fetchError } = await supabase.from("orders").select(
    "id, order_number, user_id, payment_status, status, seller_id, total, seller_promo_id, platform_promo_id"
  ).eq("id", storeOrderId).maybeSingle();
  if (fetchError || !existing) {
    return { ok: false, error: "Store order not found" };
  }
  const order = existing;
  if (order.payment_status === "Paid") {
    return { ok: true, orderNumber: order.order_number, alreadyPaid: true };
  }
  if (order.payment_status !== "Pending") {
    return { ok: false, error: "Order is not awaiting payment" };
  }
  const { error: updateError } = await supabase.from("orders").update({
    payment_status: "Paid",
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: paymentId
  }).eq("id", storeOrderId).eq("payment_status", "Pending");
  if (updateError) {
    return { ok: false, error: updateError.message };
  }
  const commissionRate = params.commissionRate ?? await fetchCommissionRate(supabase);
  await incrementPromoUsage(supabase, order);
  await decrementOrderStock(supabase, storeOrderId);
  await creditOrderEarning(
    supabase,
    {
      id: order.id,
      order_number: order.order_number,
      seller_id: order.seller_id,
      status: order.status,
      payment_status: "Paid",
      total: Number(order.total)
    },
    commissionRate
  );
  await dispatchUserNotification(supabase, {
    userId: order.user_id,
    event: "order_confirmed",
    message: `Order ${order.order_number} confirmed. Payment received.`,
    linkRoute: "OrderDetail",
    linkTargetId: order.id,
    emailVars: {
      orderNumber: order.order_number,
      total: `\u20B9${Number(order.total).toLocaleString("en-IN")}`
    }
  });
  await notifySellerNewOrder(supabase, order);
  return { ok: true, orderNumber: order.order_number, alreadyPaid: false };
}

// server/services/storeOrderPayment.ts
async function createStoreRazorpayOrder(params) {
  const supabase = requireSupabaseAdmin();
  const { data: order, error: fetchError } = await supabase.from("orders").select("id, user_id, payment_status, total").eq("id", params.storeOrderId).maybeSingle();
  if (fetchError || !order) {
    return { ok: false, error: "Store order not found" };
  }
  if (order.user_id !== params.userId) {
    return { ok: false, error: "Order does not belong to this account" };
  }
  if (order.payment_status !== "Pending") {
    return { ok: false, error: "Order is not awaiting payment" };
  }
  const amountInr = Number(order.total);
  if (!Number.isFinite(amountInr) || amountInr <= 0) {
    return { ok: false, error: "Invalid order total" };
  }
  const result = await createBookingOrder({
    amountInr,
    receipt: params.storeOrderId.replace(/-/g, "").slice(0, 40),
    notes: { store_order_id: params.storeOrderId }
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  await supabase.from("orders").update({ razorpay_order_id: result.orderId }).eq("id", params.storeOrderId).eq("payment_status", "Pending");
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? process.env.RAZORPAYX_KEY_ID?.trim() ?? null;
  return {
    ok: true,
    razorpayOrderId: result.orderId,
    amountPaise: result.amountPaise,
    amountInr,
    currency: result.currency,
    keyId,
    devMode: result.devMode ?? false
  };
}
async function confirmStoreOrderPayment(params) {
  const supabase = requireSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase.from("orders").select("id, user_id, payment_status, order_number").eq("id", params.storeOrderId).maybeSingle();
  if (fetchError || !existing) {
    return { ok: false, error: "Store order not found" };
  }
  if (existing.user_id !== params.userId) {
    return { ok: false, error: "Order does not belong to this account" };
  }
  const verified = await confirmBookingPayment({
    orderId: params.razorpayOrderId,
    paymentId: params.paymentId,
    signature: params.signature,
    devMode: params.devMode
  });
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }
  if (existing.payment_status === "Paid") {
    return {
      ok: true,
      paymentId: verified.paymentId,
      orderNumber: existing.order_number
    };
  }
  const fulfilled = await fulfillStoreOrderPayment({
    supabase,
    storeOrderId: params.storeOrderId,
    razorpayOrderId: params.razorpayOrderId,
    paymentId: verified.paymentId
  });
  if (!fulfilled.ok) {
    return { ok: false, error: fulfilled.error };
  }
  return {
    ok: true,
    paymentId: verified.paymentId,
    orderNumber: fulfilled.orderNumber
  };
}

// server/routes/storeCheckout.ts
async function handleCreatePayment(req, res) {
  try {
    const user = await requireBearerUser(req, res);
    if (!user) return;
    const { storeOrderId } = req.body;
    if (!storeOrderId) {
      return res.status(400).json({ error: "storeOrderId is required" });
    }
    const result = await createStoreRazorpayOrder({
      storeOrderId,
      userId: user.id
    });
    if (!result.ok) {
      const status = result.error.includes("not belong") ? 403 : 502;
      return res.status(status).json({ error: result.error });
    }
    return res.json({
      razorpayOrderId: result.razorpayOrderId,
      amountPaise: result.amountPaise,
      amountInr: result.amountInr,
      currency: result.currency,
      keyId: result.keyId,
      devMode: result.devMode
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create payment failed";
    return res.status(500).json({ error: message });
  }
}
async function handleConfirmPayment2(req, res) {
  try {
    const user = await requireBearerUser(req, res);
    if (!user) return;
    const { storeOrderId, razorpayOrderId, paymentId, signature, devMode } = req.body;
    if (!storeOrderId || !razorpayOrderId) {
      return res.status(400).json({ error: "storeOrderId and razorpayOrderId are required" });
    }
    const result = await confirmStoreOrderPayment({
      storeOrderId,
      userId: user.id,
      razorpayOrderId,
      paymentId: paymentId ?? "",
      signature,
      devMode
    });
    if (!result.ok) {
      const status = result.error.includes("not belong") ? 403 : 400;
      return res.status(status).json({ error: result.error });
    }
    return res.json({
      paymentId: result.paymentId,
      orderNumber: result.orderNumber
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirm payment failed";
    return res.status(500).json({ error: message });
  }
}
function registerStoreCheckoutRoutes(app2) {
  app2.post("/api/store/checkout/create-payment", handleCreatePayment);
  app2.post("/api/store/checkout/confirm-payment", handleConfirmPayment2);
}

// server/routes/walletLedger.ts
async function handleSellerSync(req, res) {
  try {
    const profile = await requireRole(req, res, "Seller");
    if (!profile) return;
    const supabase = requireSupabaseAdmin();
    const sellerId = await resolveSellerIdForProfile(supabase, profile.id);
    if (!sellerId) {
      return res.status(404).json({ error: "Seller profile not found" });
    }
    const commissionRate = await fetchCommissionRate(supabase);
    await syncSellerWalletFromOrders(supabase, sellerId, commissionRate);
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return res.status(500).json({ error: message });
  }
}
async function handleSellerRequestPayout(req, res) {
  try {
    const profile = await requireRole(req, res, "Seller");
    if (!profile) return;
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "amount is required" });
    }
    const supabase = requireSupabaseAdmin();
    const sellerId = await resolveSellerIdForProfile(supabase, profile.id);
    if (!sellerId) {
      return res.status(404).json({ error: "Seller profile not found" });
    }
    const commissionRate = await fetchCommissionRate(supabase);
    const result = await requestSellerPayout(
      supabase,
      sellerId,
      Number(amount),
      commissionRate
    );
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    await dispatchUserNotification(supabase, {
      userId: profile.id,
      event: "withdrawal_received",
      message: `Withdrawal request of \u20B9${Number(amount).toLocaleString("en-IN")} received. Processed within 3\u20137 business days.`,
      linkRoute: "Main",
      emailVars: { amount: `\u20B9${Number(amount).toLocaleString("en-IN")}` }
    });
    return res.json({ payoutId: result.payoutId, status: "Pending" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payout request failed";
    return res.status(500).json({ error: message });
  }
}
async function handlePractitionerSync(req, res) {
  try {
    const profile = await requireRole(req, res, "Practitioner");
    if (!profile) return;
    const supabase = requireSupabaseAdmin();
    const practitionerId = await resolvePractitionerIdForProfile(supabase, profile.id);
    if (!practitionerId) {
      return res.status(404).json({ error: "Practitioner profile not found" });
    }
    const commissionRate = await fetchCommissionRate(supabase);
    await syncPractitionerWalletFromBookings(
      supabase,
      practitionerId,
      commissionRate
    );
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return res.status(500).json({ error: message });
  }
}
async function handlePractitionerRequestPayout(req, res) {
  try {
    const profile = await requireRole(req, res, "Practitioner");
    if (!profile) return;
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "amount is required" });
    }
    const supabase = requireSupabaseAdmin();
    const practitionerId = await resolvePractitionerIdForProfile(supabase, profile.id);
    if (!practitionerId) {
      return res.status(404).json({ error: "Practitioner profile not found" });
    }
    const commissionRate = await fetchCommissionRate(supabase);
    const result = await requestPractitionerPayout(
      supabase,
      practitionerId,
      Number(amount),
      commissionRate
    );
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    await dispatchUserNotification(supabase, {
      userId: profile.id,
      event: "withdrawal_received",
      message: `Withdrawal request of \u20B9${Number(amount).toLocaleString("en-IN")} received. Processed within 3\u20137 business days.`,
      linkRoute: "Main",
      emailVars: { amount: `\u20B9${Number(amount).toLocaleString("en-IN")}` }
    });
    return res.json({ payoutId: result.payoutId, status: "Pending" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payout request failed";
    return res.status(500).json({ error: message });
  }
}
function registerWalletLedgerRoutes(app2) {
  app2.post("/api/wallet/seller/sync", handleSellerSync);
  app2.post("/api/wallet/seller/request-payout", handleSellerRequestPayout);
  app2.post("/api/wallet/practitioner/sync", handlePractitionerSync);
  app2.post("/api/wallet/practitioner/request-payout", handlePractitionerRequestPayout);
}

// server/services/activityLogAdmin.ts
async function insertActivityLog(supabase, params) {
  const { error } = await supabase.from("activity_log").insert({
    actor_id: params.actorId,
    actor_name: params.actorName,
    action_type: params.actionType,
    description: params.description,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    metadata: params.metadata ?? {}
  });
  if (error) console.error("[activityLogAdmin] insert:", error.message);
}

// server/services/razorpayRefund.ts
function getAuthHeader3() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAYX_KEY_SECRET;
  if (!keyId?.trim() || !keySecret?.trim()) return null;
  const token = Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString("base64");
  return `Basic ${token}`;
}
async function createRazorpayRefund(params) {
  const auth = getAuthHeader3();
  if (!auth) {
    return { ok: false, error: "Razorpay is not configured" };
  }
  const body = {
    notes: params.notes ?? {}
  };
  if (params.amountInr !== void 0) {
    body.amount = Math.round(params.amountInr * 100);
  }
  try {
    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );
    const json = await res.json();
    if (!res.ok || !json.id) {
      return {
        ok: false,
        error: json.error?.description ?? `Razorpay refund HTTP ${res.status}`
      };
    }
    return { ok: true, refundId: json.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Refund request failed"
    };
  }
}

// server/routes/adminOperations.ts
async function updateSellerPayoutStatus(payoutId, status, adminId, rejectionReason) {
  const supabase = requireSupabaseAdmin();
  const { data: payout } = await supabase.from("seller_payouts").select("*, seller_wallets(seller_id, sellers(profile_id))").eq("id", payoutId).maybeSingle();
  if (!payout) return { error: "Payout not found" };
  const patch = {
    status,
    processed_by: adminId,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (status === "Completed") patch.completed_at = (/* @__PURE__ */ new Date()).toISOString();
  if (status === "Rejected") {
    patch.rejection_reason = rejectionReason ?? "Rejected by admin";
    const amount = Number(payout.amount);
    const walletId = payout.wallet_id;
    const { data: wallet } = await supabase.from("seller_wallets").select("available_balance, pending_payout").eq("id", walletId).single();
    if (wallet) {
      await supabase.from("seller_wallets").update({
        available_balance: Number(wallet.available_balance) + amount,
        pending_payout: Math.max(0, Number(wallet.pending_payout) - amount)
      }).eq("id", walletId);
    }
  }
  await supabase.from("seller_payouts").update(patch).eq("id", payoutId);
  const profileId = payout.seller_wallets?.sellers?.profile_id ?? null;
  if (profileId) {
    const amountStr = `\u20B9${Number(payout.amount).toLocaleString("en-IN")}`;
    if (status === "Completed") {
      await dispatchUserNotification(supabase, {
        userId: profileId,
        event: "withdrawal_completed",
        message: `Your withdrawal of ${amountStr} has been completed.`,
        linkRoute: "Main"
      });
    } else if (status === "Rejected") {
      await dispatchUserNotification(supabase, {
        userId: profileId,
        event: "withdrawal_received",
        message: `Your withdrawal request was not approved. Funds returned to your wallet.`,
        linkRoute: "Main"
      });
    }
  }
  return { ok: true };
}
async function updatePractitionerPayoutStatus(payoutId, status, adminId, rejectionReason) {
  const supabase = requireSupabaseAdmin();
  const { data: payout } = await supabase.from("practitioner_payouts").select("*, practitioner_wallets(practitioner_id, practitioners(profile_id))").eq("id", payoutId).maybeSingle();
  if (!payout) return { error: "Payout not found" };
  const patch = {
    status,
    processed_by: adminId,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (status === "Completed") patch.completed_at = (/* @__PURE__ */ new Date()).toISOString();
  if (status === "Rejected") {
    patch.rejection_reason = rejectionReason ?? "Rejected by admin";
    const amount = Number(payout.amount);
    const walletId = payout.wallet_id;
    const { data: wallet } = await supabase.from("practitioner_wallets").select("available_balance, pending_payout").eq("id", walletId).single();
    if (wallet) {
      await supabase.from("practitioner_wallets").update({
        available_balance: Number(wallet.available_balance) + amount,
        pending_payout: Math.max(0, Number(wallet.pending_payout) - amount)
      }).eq("id", walletId);
    }
  }
  await supabase.from("practitioner_payouts").update(patch).eq("id", payoutId);
  const profileId = payout.practitioner_wallets?.practitioners?.profile_id ?? null;
  if (profileId && status === "Completed") {
    const amountStr = `\u20B9${Number(payout.amount).toLocaleString("en-IN")}`;
    await dispatchUserNotification(supabase, {
      userId: profileId,
      event: "withdrawal_completed",
      message: `Your withdrawal of ${amountStr} has been completed.`,
      linkRoute: "Main"
    });
  }
  return { ok: true };
}
function registerAdminOperationsRoutes(app2) {
  app2.get("/api/admin/payouts", async (req, res) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;
    const supabase = requireSupabaseAdmin();
    const [sellerPayouts, practitionerPayouts] = await Promise.all([
      supabase.from("seller_payouts").select("*, seller_wallets(seller_id, sellers(store_name, profile_id))").order("created_at", { ascending: false }).limit(100),
      supabase.from("practitioner_payouts").select("*, practitioner_wallets(practitioner_id, practitioners(name, profile_id))").order("created_at", { ascending: false }).limit(100)
    ]);
    return res.json({
      seller: sellerPayouts.data ?? [],
      practitioner: practitionerPayouts.data ?? []
    });
  });
  app2.post("/api/admin/payouts/:type/:id/status", async (req, res) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;
    const typeParam = String(Array.isArray(req.params.type) ? req.params.type[0] : req.params.type);
    const payoutId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { status, rejectionReason } = req.body;
    const allowed = ["Under Review", "Processing", "Completed", "Rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const result = typeParam === "seller" ? await updateSellerPayoutStatus(payoutId, status, admin.id, rejectionReason) : typeParam === "practitioner" ? await updatePractitionerPayoutStatus(payoutId, status, admin.id, rejectionReason) : { error: "Invalid type" };
    if ("error" in result && result.error) {
      return res.status(400).json(result);
    }
    await insertActivityLog(requireSupabaseAdmin(), {
      actorId: admin.id,
      actorName: admin.email,
      actionType: "settings",
      description: `Payout ${payoutId} marked ${status}`,
      targetType: "payout",
      targetId: payoutId
    });
    return res.json({ ok: true });
  });
  app2.get("/api/admin/refunds", async (req, res) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;
    const { data, error } = await requireSupabaseAdmin().from("refund_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ refunds: data ?? [] });
  });
  app2.post("/api/admin/refunds/:id/status", async (req, res) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;
    const { status, adminNotes } = req.body;
    const refundId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const supabase = requireSupabaseAdmin();
    const { data: existing, error: fetchError } = await supabase.from("refund_requests").select("*").eq("id", refundId).maybeSingle();
    if (fetchError || !existing) {
      return res.status(404).json({ error: "Refund request not found" });
    }
    const userId = existing.user_id;
    const orderId = existing.order_id;
    const bookingId = existing.booking_id;
    if (status === "approved") {
      const commissionRate = await fetchCommissionRate(supabase);
      let refundError;
      if (orderId) {
        const { data: order } = await supabase.from("orders").select(
          "id, order_number, seller_id, status, payment_status, total, razorpay_payment_id, seller_promo_id, platform_promo_id"
        ).eq("id", orderId).maybeSingle();
        if (!order) {
          refundError = "Order not found";
        } else if (!order.razorpay_payment_id) {
          refundError = "Order has no Razorpay payment ID \u2014 process refund manually";
        } else {
          const razorpayRefund = await createRazorpayRefund({
            paymentId: order.razorpay_payment_id,
            amountInr: Number(order.total),
            notes: { refund_request_id: refundId }
          });
          if (!razorpayRefund.ok) {
            refundError = razorpayRefund.error;
          }
        }
        if (!refundError && order) {
          await reverseOrderEarning(
            supabase,
            {
              id: order.id,
              order_number: order.order_number,
              seller_id: order.seller_id,
              status: order.status,
              payment_status: order.payment_status,
              total: Number(order.total)
            },
            commissionRate
          );
          await restoreOrderStock(supabase, orderId);
          await restorePromoUsageOnRefund(supabase, {
            seller_promo_id: order.seller_promo_id ?? null,
            platform_promo_id: order.platform_promo_id ?? null
          });
          await supabase.from("orders").update({ payment_status: "Refunded", status: "Cancelled" }).eq("id", orderId);
        }
      } else if (bookingId) {
        const { data: booking } = await supabase.from("practitioner_bookings").select(
          "id, booking_number, practitioner_id, booking_status, payment_status, amount, service_name, razorpay_payment_id"
        ).eq("id", bookingId).maybeSingle();
        if (!booking) {
          refundError = "Booking not found";
        } else if (!booking.razorpay_payment_id) {
          refundError = "Booking has no Razorpay payment ID \u2014 process refund manually";
        } else {
          const razorpayRefund = await createRazorpayRefund({
            paymentId: booking.razorpay_payment_id,
            amountInr: Number(booking.amount),
            notes: { refund_request_id: refundId }
          });
          if (!razorpayRefund.ok) {
            refundError = razorpayRefund.error;
          }
        }
        if (!refundError && booking) {
          await reverseBookingEarning(
            supabase,
            {
              id: booking.id,
              booking_number: booking.booking_number,
              practitioner_id: booking.practitioner_id,
              booking_status: booking.booking_status,
              payment_status: booking.payment_status,
              amount: Number(booking.amount),
              service_name: booking.service_name
            },
            commissionRate
          );
          await supabase.from("practitioner_bookings").update({ payment_status: "Refunded", booking_status: "Cancelled" }).eq("id", bookingId);
        }
      }
      if (refundError) {
        return res.status(502).json({ error: refundError });
      }
    }
    const { data: refund, error } = await supabase.from("refund_requests").update({
      status,
      admin_notes: adminNotes ?? null,
      reviewed_by: admin.id,
      reviewed_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", refundId).select().single();
    if (error) return res.status(400).json({ error: error.message });
    if (status === "approved") {
      await dispatchUserNotification(supabase, {
        userId,
        event: "refund_approved",
        message: "Your refund request has been approved. Funds will return within 7\u201310 business days.",
        linkRoute: "OrderHistory",
        emailVars: { reference: refundId }
      });
    } else if (status === "rejected") {
      await dispatchUserNotification(supabase, {
        userId,
        event: "refund_approved",
        message: "Your refund request was reviewed and could not be approved.",
        linkRoute: "OrderHistory",
        emailVars: { reference: refundId }
      });
    }
    await insertActivityLog(supabase, {
      actorId: admin.id,
      actorName: admin.email,
      actionType: "store",
      description: `Refund request ${refundId} marked ${status}`,
      targetType: "refund",
      targetId: refundId
    });
    return res.json({ ok: true, refund });
  });
  app2.post("/api/admin/users/:id/role", async (req, res) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;
    const userId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { role } = req.body;
    if (!role || !["User", "Seller", "Practitioner", "Admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase.rpc("admin_provision_user_role", {
      p_user_id: userId,
      p_role: role,
      p_admin_id: admin.id
    });
    if (error) return res.status(400).json({ error: error.message });
    const result = data;
    if (!result?.ok) {
      return res.status(400).json({ error: result?.error ?? "Could not update role" });
    }
    await insertActivityLog(supabase, {
      actorId: admin.id,
      actorName: admin.email,
      actionType: "user",
      description: `User ${userId} role set to ${role}`,
      targetType: "user",
      targetId: userId
    });
    return res.json({ ok: true, role });
  });
}

// server/routes/transactionalHooks.ts
var AUTH_TEMPLATES = [
  "account_created",
  "email_verified",
  "password_changed",
  "password_reset_requested"
];
function registerTransactionalHooksRoutes(app2) {
  app2.post("/api/hooks/auth-email", async (req, res) => {
    const user = await requireBearerUser(req, res);
    if (!user) return;
    const { template } = req.body;
    if (!template || !AUTH_TEMPLATES.includes(template)) {
      return res.status(400).json({ error: "Invalid template" });
    }
    const result = await sendEmailToUserId(requireSupabaseAdmin(), user.id, template);
    if (!result.ok) return res.status(500).json({ error: result.error });
    return res.json({ ok: true, skipped: result.skipped });
  });
  app2.post("/api/hooks/password-reset-requested", async (req, res) => {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: "Email required" });
    const result = await sendTransactionalEmail("password_reset_requested", email.trim(), {
      name: "there"
    });
    if (!result.ok) return res.status(500).json({ error: result.error });
    return res.json({ ok: true, skipped: result.skipped });
  });
  app2.post("/api/hooks/notify-user", async (req, res) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;
    const { userId, event, message, linkRoute, linkTargetId, emailVars, emailTemplate } = req.body;
    if (!userId || !event || !message) {
      return res.status(400).json({ error: "userId, event, and message required" });
    }
    await dispatchUserNotification(requireSupabaseAdmin(), {
      userId,
      event,
      message,
      linkRoute,
      linkTargetId: linkTargetId ?? null,
      emailVars,
      emailTemplateOverride: emailTemplate
    });
    return res.json({ ok: true });
  });
  app2.post("/api/hooks/self-notify", async (req, res) => {
    const user = await requireBearerUser(req, res);
    if (!user) return;
    const { event, message, linkRoute, linkTargetId, emailVars, emailTemplate } = req.body;
    if (!event || !message) {
      return res.status(400).json({ error: "event and message required" });
    }
    await dispatchUserNotification(requireSupabaseAdmin(), {
      userId: user.id,
      event,
      message,
      linkRoute,
      linkTargetId: linkTargetId ?? null,
      emailVars,
      emailTemplateOverride: emailTemplate
    });
    return res.json({ ok: true });
  });
}

// server/services/paymentWebhooks.ts
import crypto3 from "node:crypto";
function verifyPaymentWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? process.env.RAZORPAYX_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signature) return false;
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto3.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto3.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return expected === signature;
  }
}
async function resolveStoreOrderId(supabase, razorpayOrderId, notes) {
  const fromNotes = notes?.store_order_id;
  if (fromNotes) return fromNotes;
  const { data } = await supabase.from("orders").select("id").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
  return data?.id ?? null;
}
async function handlePaymentCaptured(payload) {
  const entity = payload.payment?.entity;
  const paymentId = entity?.id;
  const razorpayOrderId = entity?.order_id;
  if (!paymentId || !razorpayOrderId) {
    return { matched: false };
  }
  const supabase = requireSupabaseAdmin();
  const notes = entity.notes ?? {};
  const storeOrderId = await resolveStoreOrderId(supabase, razorpayOrderId, notes);
  if (storeOrderId) {
    const { data: order } = await supabase.from("orders").select("user_id").eq("id", storeOrderId).maybeSingle();
    if (order?.user_id) {
      const result = await fulfillStoreOrderPayment({
        supabase,
        storeOrderId,
        razorpayOrderId,
        paymentId
      });
      if (result.ok) {
        return { matched: true, type: "store_order", id: storeOrderId };
      }
    }
  }
  const { data: pending } = await supabase.from("pending_booking_checkouts").select("user_id, booking_draft").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
  if (pending?.user_id) {
    const result = await fulfillBookingPayment({
      supabase,
      userId: pending.user_id,
      razorpayOrderId,
      paymentId,
      booking: pending.booking_draft
    });
    if (result.ok) {
      return { matched: true, type: "booking", id: result.bookingId };
    }
  }
  return { matched: false };
}

// server/routes/paymentWebhooks.ts
async function handleRazorpayPaymentWebhook(req, res) {
  try {
    const signature = req.header("x-razorpay-signature");
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    if (!verifyPaymentWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
    const payload = req.body;
    const event = payload.event ?? "";
    if (event === "payment.captured" || event === "order.paid") {
      const result = await handlePaymentCaptured(payload.payload ?? {});
      return res.status(200).json({ received: true, ...result });
    }
    return res.status(200).json({ received: true, matched: false, event });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    console.error("[paymentWebhooks]", err);
    return res.status(500).json({ error: message });
  }
}
function registerPaymentWebhookRoutes(app2) {
  app2.post("/api/webhooks/razorpay", handleRazorpayPaymentWebhook);
}

// server/routes/account.ts
function registerAccountRoutes(app2) {
  app2.post("/api/account/request-deletion", async (req, res) => {
    const user = await requireBearerUser(req, res);
    if (!user) return;
    const { reason } = req.body;
    const supabase = requireSupabaseAdmin();
    const trimmedReason = reason?.trim() || null;
    const { data: existing } = await supabase.from("account_deletion_requests").select("status, requested_at").eq("user_id", user.id).maybeSingle();
    const nextStatus = existing?.status === "cancelled" || !existing ? "pending" : existing.status;
    const requestedAt = existing?.status === "cancelled" || !existing ? (/* @__PURE__ */ new Date()).toISOString() : existing.requested_at;
    const { error: upsertError } = await supabase.from("account_deletion_requests").upsert(
      {
        user_id: user.id,
        reason: trimmedReason,
        status: nextStatus,
        requested_at: requestedAt
      },
      { onConflict: "user_id" }
    );
    if (upsertError) {
      return res.status(400).json({ error: upsertError.message });
    }
    await supabase.from("profiles").update({ status: "Deletion Requested", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", user.id);
    void sendEmailToUserId(supabase, user.id, "account_deletion_requested", {
      name: user.email?.split("@")[0] ?? "there"
    });
    return res.json({ ok: true });
  });
  app2.post("/api/admin/users/:id/complete-deletion", async (req, res) => {
    const admin = await requireRole(req, res, "Admin");
    if (!admin) return;
    const userId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const supabase = requireSupabaseAdmin();
    const { data: openOrders } = await supabase.from("orders").select("id").eq("user_id", userId).in("status", ["Pending", "Processing", "Shipped"]).limit(1);
    if (openOrders?.length) {
      return res.status(409).json({ error: "User has open orders. Resolve them before deletion." });
    }
    const { data: openBookings } = await supabase.from("practitioner_bookings").select("id").eq("user_id", userId).in("booking_status", ["Pending", "Confirmed"]).limit(1);
    if (openBookings?.length) {
      return res.status(409).json({
        error: "User has upcoming sessions. Cancel them before deletion."
      });
    }
    await supabase.from("profiles").update({
      full_name: "Deleted User",
      email: `deleted+${userId.slice(0, 8)}@deleted.local`,
      phone: null,
      status: "Deleted",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", userId);
    await supabase.from("account_deletion_requests").update({
      status: "completed",
      processed_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("user_id", userId);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }
    await insertActivityLog(supabase, {
      actorId: admin.id,
      actorName: admin.email,
      actionType: "user",
      description: `Completed account deletion for user ${userId}`,
      targetType: "user",
      targetId: userId
    });
    return res.json({ ok: true });
  });
}

// server/routes.ts
async function registerRoutes(app2) {
  registerPayoutRoutes(app2);
  registerPractitionerPayoutRoutes(app2);
  registerBookingCheckoutRoutes(app2);
  registerStoreCheckoutRoutes(app2);
  registerWalletLedgerRoutes(app2);
  registerAdminOperationsRoutes(app2);
  registerTransactionalHooksRoutes(app2);
  registerPaymentWebhookRoutes(app2);
  registerAccountRoutes(app2);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
loadEnv();
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    if (process.env.CORS_ALLOWED_ORIGINS) {
      process.env.CORS_ALLOWED_ORIGINS.split(",").forEach((entry) => {
        const trimmed = entry.trim();
        if (trimmed) origins.add(trimmed);
      });
    }
    if (process.env.EXPO_PUBLIC_DOMAIN) {
      const domain = process.env.EXPO_PUBLIC_DOMAIN.trim().replace(/^https?:\/\//, "");
      if (domain) {
        origins.add(`https://${domain}`);
        origins.add(`http://${domain}`);
      }
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Razorpay-Signature"
      );
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  const { assertServerProductionEnv: assertServerProductionEnv2 } = await Promise.resolve().then(() => (init_productionEnv(), productionEnv_exports));
  assertServerProductionEnv2();
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
