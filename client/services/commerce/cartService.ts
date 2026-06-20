import type { CartCheckoutState, CartItem, ProductSnapshot } from "@/data/cart";
import { EMPTY_CHECKOUT } from "@/data/cart";
import { deliveryFeeForOption } from "@/constants/deliveryOptions";
import { getSupabase } from "@/lib/supabase";
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

function mapSession(row: DbCartSessionRow): CartCheckoutState {
  return {
    sessionId: row.id,
    deliveryOption: row.delivery_option,
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

async function recalculateSessionTotals(
  sessionId: string,
  deliveryOption?: string
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
  const option = deliveryOption ?? sessionRow.delivery_option;
  const delivery_fee = deliveryFeeForOption(option);

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

  const { data: updated, error } = await supabase
    .from("cart_sessions")
    .update({
      delivery_option: option,
      subtotal,
      delivery_fee,
      seller_promo_id,
      platform_promo_id,
      promo_code,
      promo_discount,
      total,
      checkout_status: "active",
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error || !updated) {
    console.error("[cartService] recalc:", error?.message);
    return null;
  }

  return mapSession(updated as DbCartSessionRow);
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
  orderNote?: string;
}): Promise<CartCheckoutState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const sessionId = await ensureCartSessionId();
  if (!sessionId) return null;

  if (input.deliveryOption !== undefined) {
    return recalculateSessionTotals(sessionId, input.deliveryOption);
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
  await supabase
    .from("cart_sessions")
    .update({
      delivery_option: "standard",
      order_note: "",
      checkout_status: "active",
      subtotal: 0,
      delivery_fee: 0,
      total: 0,
      seller_promo_id: null,
      platform_promo_id: null,
      promo_code: "",
      promo_discount: 0,
    })
    .eq("id", session.id);
}
