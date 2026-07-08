import type { CartCheckoutState, CartItem, ProductSnapshot } from "@/data/cart";
import { EMPTY_CHECKOUT } from "@/data/cart";
import type { DeliveryTierId } from "@/constants/sellerDelivery";
import {
  deliveryFeeForSellerOption,
  getEnabledSellerDeliveryOptions,
  parseSellerDeliverySettings,
} from "@/constants/sellerDelivery";
import { fetchSellerDeliveryBySellerIds } from "@/services/commerce/sellerDeliveryService";
import { getSupabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabaseSchemaErrors";
import {
  fetchActivePromoForSellerByCode,
  fetchProductSellerIds,
  fetchSellerPromoById,
  validatePromoRowForCart,
} from "@/services/commerce/sellerPromosService";
import {
  fetchActivePlatformPromoByCode,
  fetchPlatformPromoById,
  validatePlatformPromoRowForCart,
} from "@/services/commerce/platformPromosService";

export type DbCartSessionRow = {
  id: string;
  user_id: string;
  delivery_option: string;
  seller_delivery_options?: Record<string, string> | null;
  order_note: string;
  checkout_status: "active" | "checkout" | "completed";
  subtotal: number;
  delivery_fee: number;
  total: number;
  seller_promo_id?: string | null;
  platform_promo_id?: string | null;
  promo_code?: string | null;
  promo_discount?: number | null;
};

export type DbCartItemRow = {
  id: string;
  cart_session_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
  product_category: string;
  line_total: number;
};

export type CartSnapshot = {
  checkout: CartCheckoutState;
  items: CartItem[];
};

function parseSellerDeliveryOptions(raw: unknown): Record<string, DeliveryTierId> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, DeliveryTierId> = {};
  for (const [sellerId, optionId] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof sellerId === "string" &&
      (optionId === "standard" || optionId === "express" || optionId === "overnight")
    ) {
      out[sellerId] = optionId;
    }
  }
  return out;
}

function mapSession(row: DbCartSessionRow): CartCheckoutState {
  return {
    sessionId: row.id,
    deliveryOption: row.delivery_option,
    sellerDeliveryOptions: parseSellerDeliveryOptions(row.seller_delivery_options),
    orderNote: row.order_note ?? "",
    checkoutStatus: row.checkout_status,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    promoDiscount: Number(row.promo_discount ?? 0),
    sellerPromoId: row.seller_promo_id ?? null,
    platformPromoId: row.platform_promo_id ?? null,
    promoCode: row.promo_code ?? "",
    total: Number(row.total),
  };
}

function mapItem(row: DbCartItemRow): CartItem {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    productName: row.product_name,
    productCategory: row.product_category,
  };
}

async function fetchProductSnapshot(productId: string): Promise<ProductSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("products")
    .select("name, category, price")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) {
    console.error("[cartService] product:", error?.message);
    return null;
  }

  return {
    name: data.name as string,
    category: (data.category as string) || "General",
    price: Number(data.price),
  };
}

async function ensureCartSessionId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("cart_sessions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("cart_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[cartService] create session:", error?.message);
    return null;
  }

  return created.id as string;
}

async function fetchCartProductSellerMap(
  sessionId: string
): Promise<Map<string, string | null>> {
  const supabase = getSupabase();
  if (!supabase) return new Map();

  const { data: itemRows } = await supabase
    .from("cart_items")
    .select("product_id")
    .eq("cart_session_id", sessionId);

  const productIds = ((itemRows ?? []) as { product_id: string }[]).map((r) => r.product_id);
  if (productIds.length === 0) return new Map();

  const { data: products } = await supabase.from("products").select("id, seller_id").in("id", productIds);

  const map = new Map<string, string | null>();
  for (const row of (products ?? []) as { id: string; seller_id: string | null }[]) {
    map.set(row.id, row.seller_id);
  }
  return map;
}

async function resolveSellerDeliveryTotals(
  sessionId: string,
  sellerDeliveryOptions: Record<string, DeliveryTierId>
): Promise<{
  deliveryFee: number;
  sellerDeliveryOptions: Record<string, DeliveryTierId>;
  primaryDeliveryOption: string;
}> {
  const productSellerMap = await fetchCartProductSellerMap(sessionId);
  const sellerIds = [
    ...new Set(
      [...productSellerMap.values()].filter((id): id is string => Boolean(id))
    ),
  ];

  if (sellerIds.length === 0) {
    return {
      deliveryFee: 0,
      sellerDeliveryOptions: {},
      primaryDeliveryOption: "standard",
    };
  }

  const profiles = await fetchSellerDeliveryBySellerIds(sellerIds);
  const nextOptions: Record<string, DeliveryTierId> = { ...sellerDeliveryOptions };
  let deliveryFee = 0;
  let primaryDeliveryOption = "standard";

  for (const sellerId of sellerIds) {
    const profile = profiles[sellerId];
    const settings = profile?.settings ?? parseSellerDeliverySettings(null);
    const enabled = getEnabledSellerDeliveryOptions(settings);
    const fallback = enabled[0]?.id ?? "standard";
    const selected = nextOptions[sellerId];
    const valid =
      selected && enabled.some((o) => o.id === selected) ? selected : fallback;
    nextOptions[sellerId] = valid;
    deliveryFee += deliveryFeeForSellerOption(settings, valid);
    if (!primaryDeliveryOption || sellerIds[0] === sellerId) {
      primaryDeliveryOption = valid;
    }
  }

  return { deliveryFee, sellerDeliveryOptions: nextOptions, primaryDeliveryOption };
}

async function recalculateSessionTotals(
  sessionId: string,
  deliveryOption?: string,
  sellerDeliveryOptions?: Record<string, DeliveryTierId>
): Promise<CartCheckoutState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: session } = await supabase
    .from("cart_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) return null;

  const sessionRow = session as DbCartSessionRow;

  const { data: items } = await supabase
    .from("cart_items")
    .select("line_total")
    .eq("cart_session_id", sessionId);

  const subtotal = ((items ?? []) as { line_total: number }[]).reduce(
    (s, i) => s + Number(i.line_total),
    0
  );

  const currentOptions =
    sellerDeliveryOptions ?? parseSellerDeliveryOptions(sessionRow.seller_delivery_options);

  const deliveryResolved = await resolveSellerDeliveryTotals(sessionId, currentOptions);
  const option = deliveryOption ?? deliveryResolved.primaryDeliveryOption;
  const delivery_fee = deliveryResolved.deliveryFee;
  const mergedSellerOptions = deliveryResolved.sellerDeliveryOptions;

  let seller_promo_id = sessionRow.seller_promo_id ?? null;
  let platform_promo_id = sessionRow.platform_promo_id ?? null;
  let promo_code = sessionRow.promo_code ?? "";
  let promo_discount = 0;

  if (seller_promo_id) {
    const promoRow = await fetchSellerPromoById(seller_promo_id);
    if (!promoRow) {
      seller_promo_id = null;
      promo_code = "";
    } else {
      const v = validatePromoRowForCart(subtotal, promoRow);
      if (!v.ok) {
        seller_promo_id = null;
        promo_code = "";
      } else {
        promo_discount = v.discountAmount;
        platform_promo_id = null;
      }
    }
  }

  if (!promo_discount && platform_promo_id) {
    const pRow = await fetchPlatformPromoById(platform_promo_id);
    if (!pRow) {
      platform_promo_id = null;
      promo_code = "";
    } else {
      const v = validatePlatformPromoRowForCart(subtotal, pRow);
      if (!v.ok) {
        platform_promo_id = null;
        promo_code = "";
      } else {
        promo_discount = v.discountAmount;
        seller_promo_id = null;
      }
    }
  }

  if (!promo_discount) {
    seller_promo_id = null;
    platform_promo_id = null;
    promo_code = "";
  }

  const total = Math.max(0, subtotal - promo_discount) + delivery_fee;

  const fullPatch = {
    delivery_option: option,
    seller_delivery_options: mergedSellerOptions,
    subtotal,
    delivery_fee,
    seller_promo_id,
    platform_promo_id,
    promo_code,
    promo_discount,
    total,
    checkout_status: "active" as const,
  };

  let { data: updated, error } = await supabase
    .from("cart_sessions")
    .update(fullPatch)
    .eq("id", sessionId)
    .select()
    .single();

  if (error && isMissingColumnError(error.message, "seller_delivery_options")) {
    const { seller_delivery_options: _omit, ...legacyPatch } = fullPatch;
    const retry = await supabase
      .from("cart_sessions")
      .update(legacyPatch)
      .eq("id", sessionId)
      .select()
      .single();
    updated = retry.data;
    error = retry.error;
  }

  if (error || !updated) {
    console.error("[cartService] recalc:", error?.message);
    return {
      sessionId,
      deliveryOption: option,
      sellerDeliveryOptions: mergedSellerOptions,
      orderNote: sessionRow.order_note ?? "",
      checkoutStatus: sessionRow.checkout_status,
      subtotal,
      deliveryFee: delivery_fee,
      promoDiscount: promo_discount,
      sellerPromoId: seller_promo_id,
      platformPromoId: platform_promo_id,
      promoCode: promo_code,
      total,
    };
  }

  const mapped = mapSession(updated as DbCartSessionRow);
  return {
    ...mapped,
    sellerDeliveryOptions: mergedSellerOptions,
  };
}

export async function applyPromoCode(rawCode: string): Promise<{ snap: CartSnapshot } | { error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return { error: "Sign in required" };

  const { data: rows } = await supabase.from("cart_items").select("product_id").eq("cart_session_id", sessionId);

  const productIds = ((rows ?? []) as { product_id: string }[]).map((r) => r.product_id);
  if (productIds.length === 0) return { error: "Your cart is empty." };

  const sellerIds = await fetchProductSellerIds(productIds);

  const { data: lineRows } = await supabase
    .from("cart_items")
    .select("line_total")
    .eq("cart_session_id", sessionId);

  const subtotal = ((lineRows ?? []) as { line_total: number }[]).reduce(
    (s, i) => s + Number(i.line_total),
    0
  );

  const codeNorm = rawCode.trim().toUpperCase();
  if (!codeNorm) {
    return { error: "Enter a promo code." };
  }

  if (sellerIds.length === 1) {
    const sellerLookup = await fetchActivePromoForSellerByCode(sellerIds[0], rawCode);
    if (sellerLookup.ok) {
      const validated = validatePromoRowForCart(subtotal, sellerLookup.row);
      if (validated.ok) {
        const { error } = await supabase
          .from("cart_sessions")
          .update({
            seller_promo_id: validated.promo.id,
            platform_promo_id: null,
            promo_code: codeNorm,
          })
          .eq("id", sessionId);

        if (error) {
          console.error("[cartService] apply seller promo:", error.message);
          return { error: error.message };
        }

        await recalculateSessionTotals(sessionId);
        return { snap: await fetchCart() };
      }
    }
  }

  const platformLookup = await fetchActivePlatformPromoByCode(rawCode);
  if (!platformLookup.ok) {
    return { error: platformLookup.error };
  }

  const validatedPl = validatePlatformPromoRowForCart(subtotal, platformLookup.row);
  if (!validatedPl.ok) {
    return { error: validatedPl.error };
  }

  const { error: perr } = await supabase
    .from("cart_sessions")
    .update({
      platform_promo_id: validatedPl.promo.id,
      seller_promo_id: null,
      promo_code: codeNorm,
    })
    .eq("id", sessionId);

  if (perr) {
    console.error("[cartService] apply platform promo:", perr.message);
    return { error: perr.message };
  }

  await recalculateSessionTotals(sessionId);
  const snap = await fetchCart();
  return { snap };
}

export async function clearAppliedPromo(): Promise<CartSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return null;

  const { error } = await supabase
    .from("cart_sessions")
    .update({
      seller_promo_id: null,
      platform_promo_id: null,
      promo_code: "",
      promo_discount: 0,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[cartService] clear promo:", error.message);
    return null;
  }

  await recalculateSessionTotals(sessionId);
  return fetchCart();
}

export async function fetchCart(): Promise<CartSnapshot> {
  const supabase = getSupabase();
  if (!supabase) return { checkout: { ...EMPTY_CHECKOUT }, items: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { checkout: { ...EMPTY_CHECKOUT }, items: [] };

  const { data: session, error: sessionError } = await supabase
    .from("cart_sessions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    console.error("[cartService] fetch session:", sessionError.message);
    throw new Error(sessionError.message);
  }

  if (!session) {
    return { checkout: { ...EMPTY_CHECKOUT }, items: [] };
  }

  const sessionRow = session as DbCartSessionRow;

  const { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_session_id", sessionRow.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("[cartService] fetch items:", itemsError.message);
    throw new Error(itemsError.message);
  }

  return {
    checkout: mapSession(sessionRow),
    items: ((items ?? []) as DbCartItemRow[]).map(mapItem),
  };
}

export async function addOrIncrementItem(
  productId: string,
  snapshot?: ProductSnapshot
): Promise<CartSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return null;

  const product = snapshot ?? (await fetchProductSnapshot(productId));
  if (!product) return null;

  const { data: existing } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_session_id", sessionId)
    .eq("product_id", productId)
    .maybeSingle();

  const existingRow = existing as DbCartItemRow | null;
  const nextQty = Math.min((existingRow?.quantity ?? 0) + 1, 10);
  const unit_price = existingRow ? Number(existingRow.unit_price) : product.price;
  const line_total = unit_price * nextQty;

  if (existingRow) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: nextQty, line_total })
      .eq("id", existingRow.id);
    if (error) {
      console.error("[cartService] update qty:", error.message);
      return null;
    }
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_session_id: sessionId,
      product_id: productId,
      quantity: 1,
      unit_price: product.price,
      product_name: product.name,
      product_category: product.category,
      line_total: product.price,
    });
    if (error) {
      console.error("[cartService] insert item:", error.message);
      return null;
    }
  }

  await recalculateSessionTotals(sessionId);
  return fetchCart();
}

export async function setItemQuantity(
  productId: string,
  quantity: number
): Promise<CartSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return null;

  if (quantity <= 0) {
    return removeItem(productId);
  }

  const qty = Math.min(quantity, 10);

  const { data: existing } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_session_id", sessionId)
    .eq("product_id", productId)
    .maybeSingle();

  const row = existing as DbCartItemRow | null;
  if (!row) return fetchCart();

  const line_total = Number(row.unit_price) * qty;
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity: qty, line_total })
    .eq("id", row.id);

  if (error) {
    console.error("[cartService] set qty:", error.message);
    return null;
  }

  await recalculateSessionTotals(sessionId);
  return fetchCart();
}

export async function removeItem(productId: string): Promise<CartSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return null;

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_session_id", sessionId)
    .eq("product_id", productId);

  if (error) {
    console.error("[cartService] remove:", error.message);
    return null;
  }

  await recalculateSessionTotals(sessionId);
  return fetchCart();
}

export async function updateCartPreferences(input: {
  deliveryOption?: string;
  sellerDeliveryOptions?: Record<string, DeliveryTierId>;
  orderNote?: string;
}): Promise<CartCheckoutState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return null;

  if (input.deliveryOption !== undefined || input.sellerDeliveryOptions !== undefined) {
    const snap = await fetchCart();
    const merged = {
      ...snap.checkout.sellerDeliveryOptions,
      ...(input.sellerDeliveryOptions ?? {}),
    };
    return recalculateSessionTotals(sessionId, input.deliveryOption, merged);
  }

  if (input.orderNote !== undefined) {
    const { data, error } = await supabase
      .from("cart_sessions")
      .update({ order_note: input.orderNote })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !data) {
      console.error("[cartService] note:", error?.message);
      return null;
    }
    return mapSession(data as DbCartSessionRow);
  }

  const snap = await fetchCart();
  return snap.checkout;
}

export async function prepareCheckout(): Promise<CartSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return null;

  const snap = await fetchCart();
  if (snap.items.length === 0) return null;

  const checkout = await recalculateSessionTotals(sessionId, snap.checkout.deliveryOption);
  if (!checkout) return null;

  const { error } = await supabase
    .from("cart_sessions")
    .update({ checkout_status: "checkout" })
    .eq("id", sessionId);

  if (error) {
    console.error("[cartService] checkout:", error.message);
    return null;
  }

  return fetchCart();
}

export async function clearCart(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: session } = await supabase
    .from("cart_sessions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session?.id) return;

  await supabase.from("cart_items").delete().eq("cart_session_id", session.id);

  const resetPatch = {
    delivery_option: "standard",
    seller_delivery_options: {},
    order_note: "",
    checkout_status: "active" as const,
    subtotal: 0,
    delivery_fee: 0,
    total: 0,
    seller_promo_id: null,
    platform_promo_id: null,
    promo_code: "",
    promo_discount: 0,
  };

  let { error } = await supabase.from("cart_sessions").update(resetPatch).eq("id", session.id);

  if (error && isMissingColumnError(error.message, "seller_delivery_options")) {
    const { seller_delivery_options: _omit, ...legacyReset } = resetPatch;
    ({ error } = await supabase.from("cart_sessions").update(legacyReset).eq("id", session.id));
  }

  if (error) {
    console.error("[cartService] clear:", error.message);
  }
}

export async function removeItemsByProductIds(productIds: string[]): Promise<CartSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase || productIds.length === 0) return null;

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return null;

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_session_id", sessionId)
    .in("product_id", productIds);

  if (error) {
    console.error("[cartService] remove batch:", error.message);
    return null;
  }

  await recalculateSessionTotals(sessionId);
  return fetchCart();
}

export async function setSellerDeliveryOption(
  sellerId: string,
  optionId: DeliveryTierId
): Promise<CartSnapshot | null> {
  const snap = await fetchCart();
  if (!snap.checkout.sessionId) return null;

  await recalculateSessionTotals(snap.checkout.sessionId, optionId, {
    ...snap.checkout.sellerDeliveryOptions,
    [sellerId]: optionId,
  });
  return fetchCart();
}
