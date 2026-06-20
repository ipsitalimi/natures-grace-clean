import { getSupabase } from "@/lib/supabase";
import {
  deliveryStatusForOrderStatus,
  type DeliveryStatus,
  type OrderStatus,
  type PaymentStatus,
  type SellerOrder,
} from "@/data/orders";

export type DbOrderRow = {
  id: string;
  order_number: string;
  seller_id: string | null;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  delivery_option: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  seller_promo_id: string | null;
  promo_discount: number;
  platform_promo_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  courier?: string | null;
  tracking_number?: string | null;
  tracking_status?: string | null;
  expected_delivery?: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_category: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type OrderWithItems = {
  order: DbOrderRow;
  items: DbOrderItemRow[];
};

function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Maps DB order + items to the seller card shape (primary line item). */
export function toSellerOrder(row: DbOrderRow, items: DbOrderItemRow[]): SellerOrder {
  const primary = items[0];
  const extra = items.length > 1 ? items.length - 1 : 0;
  const qty = items.reduce((s, i) => s + i.quantity, 0);

  return {
    id: row.id,
    orderId: row.order_number,
    customerName: row.customer_name,
    productName:
      extra > 0 && primary
        ? `${primary.product_name} +${extra} more`
        : primary?.product_name ?? "Order items",
    productCategory: primary?.product_category ?? "General",
    price: Number(row.total),
    qty,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    date: formatOrderDate(row.created_at),
  };
}

export async function fetchOrdersWithItems(): Promise<OrderWithItems[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("[ordersService] fetch orders:", ordersError.message);
    return [];
  }
  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  if (itemsError) {
    console.error("[ordersService] fetch items:", itemsError.message);
    return [];
  }

  const itemsByOrder = new Map<string, DbOrderItemRow[]>();
  for (const item of (items ?? []) as DbOrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return (orders as DbOrderRow[]).map((order) => ({
    order,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function fetchSellerOrders(): Promise<SellerOrder[]> {
  const rows = await fetchOrdersWithItems();
  return rows.map(({ order, items }) => toSellerOrder(order, items));
}

export async function fetchOrdersForUser(userId: string): Promise<SellerOrder[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("[ordersService] fetch user orders:", ordersError.message);
    return [];
  }
  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  if (itemsError) {
    console.error("[ordersService] fetch user order items:", itemsError.message);
    return [];
  }

  const itemsByOrder = new Map<string, DbOrderItemRow[]>();
  for (const item of (items ?? []) as DbOrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return (orders as DbOrderRow[]).map((order) =>
    toSellerOrder(order, itemsByOrder.get(order.id) ?? [])
  );
}

export async function cancelPendingOrder(orderId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("orders")
    .update({
      status: "Cancelled",
      delivery_status: "Cancelled",
    })
    .eq("id", orderId)
    .eq("payment_status", "Pending");

  if (error) {
    console.error("[ordersService] cancel pending order:", error.message);
    return false;
  }
  return true;
}

export async function fetchOrdersForSeller(sellerId: string): Promise<SellerOrder[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("[ordersService] fetch seller orders:", ordersError.message);
    return [];
  }
  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  if (itemsError) {
    console.error("[ordersService] fetch seller order items:", itemsError.message);
    return [];
  }

  const itemsByOrder = new Map<string, DbOrderItemRow[]>();
  for (const item of (items ?? []) as DbOrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return (orders as DbOrderRow[]).map((order) =>
    toSellerOrder(order, itemsByOrder.get(order.id) ?? [])
  );
}

export type BuyerOrderDetail = {
  order: DbOrderRow;
  items: DbOrderItemRow[];
};

export async function fetchOrderForUser(
  orderId: string,
  userId: string
): Promise<BuyerOrderDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orderError || !orderRow) {
    if (orderError) console.error("[ordersService] fetch order detail:", orderError.message);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsError) {
    console.error("[ordersService] fetch order detail items:", itemsError.message);
    return null;
  }

  return {
    order: orderRow as DbOrderRow,
    items: (items ?? []) as DbOrderItemRow[],
  };
}

/** Cancel pending orders older than maxAgeHours for the signed-in buyer. */
export async function cleanupStalePendingOrders(
  userId: string,
  maxAgeHours = 24
): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "Cancelled", delivery_status: "Cancelled" })
    .eq("user_id", userId)
    .eq("payment_status", "Pending")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    console.error("[ordersService] cleanup stale pending:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentStatus?: PaymentStatus
): Promise<SellerOrder | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: before } = await supabase
    .from("orders")
    .select("user_id, order_number, status")
    .eq("id", orderId)
    .maybeSingle();

  const delivery_status = deliveryStatusForOrderStatus(status);
  const patch: Record<string, unknown> = { status, delivery_status };
  if (paymentStatus) patch.payment_status = paymentStatus;

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("[ordersService] update status:", error.message);
    return null;
  }

  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);

  const buyerId = (before as { user_id?: string } | null)?.user_id;
  const orderNumber = (before as { order_number?: string } | null)?.order_number;
  const previousStatus = (before as { status?: string } | null)?.status;
  if (buyerId && orderNumber && previousStatus !== status) {
    const statusMessages: Partial<Record<OrderStatus, string>> = {
      Packed: `Order ${orderNumber} has been packed and is being prepared.`,
      Shipped: `Order ${orderNumber} has shipped.`,
      Delivered: `Order ${orderNumber} was delivered.`,
      Cancelled: `Order ${orderNumber} was cancelled.`,
    };
    const msg = statusMessages[status];
    if (msg) {
      await supabase.from("notifications").insert({
        user_id: buyerId,
        message: msg,
        is_read: false,
        link_route: "OrderDetail",
        link_target_id: orderId,
      });
    }
  }

  return toSellerOrder(data as DbOrderRow, (items ?? []) as DbOrderItemRow[]);
}

export async function updateOrderShipping(
  orderId: string,
  shipping: {
    courier?: string;
    trackingNumber?: string;
    trackingStatus?: string;
    expectedDelivery?: string;
  }
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const patch: Record<string, unknown> = {};
  if (shipping.courier !== undefined) patch.courier = shipping.courier || null;
  if (shipping.trackingNumber !== undefined) patch.tracking_number = shipping.trackingNumber || null;
  if (shipping.trackingStatus !== undefined) patch.tracking_status = shipping.trackingStatus || null;
  if (shipping.expectedDelivery !== undefined) {
    patch.expected_delivery = shipping.expectedDelivery || null;
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) {
    console.error("[ordersService] update shipping:", error.message);
    return false;
  }
  return true;
}

export type CreateOrderItemInput = {
  productId?: string;
  productName: string;
  productCategory: string;
  quantity: number;
  unitPrice: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerEmail?: string;
  userId?: string;
  items: CreateOrderItemInput[];
  paymentStatus?: PaymentStatus;
  deliveryOption?: string;
  deliveryFee?: number;
  notes?: string;
  promoDiscount?: number;
  sellerPromoId?: string | null;
  platformPromoId?: string | null;
};

async function sellerIdFromProducts(
  items: CreateOrderItemInput[]
): Promise<string | null> {
  const ids = [...new Set(items.map((i) => i.productId).filter(Boolean) as string[])];
  if (ids.length === 0) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("products").select("seller_id").in("id", ids);
  if (error || !data?.length) return null;
  const uniq = [...new Set((data as { seller_id: string | null }[]).map((r) => r.seller_id).filter(Boolean))];
  return uniq.length === 1 ? (uniq[0] as string) : null;
}

async function generateOrderNumber(): Promise<string> {
  const supabase = getSupabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `#NG-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!supabase) return candidate;
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `#NG-${Date.now().toString().slice(-8)}`;
}

export async function createOrder(input: CreateOrderInput): Promise<SellerOrder | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const itemSubtotal = input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const promo_discount = Math.min(input.promoDiscount ?? 0, itemSubtotal);
  const delivery_fee = input.deliveryFee ?? 0;
  const subtotal = itemSubtotal;
  const total = Math.max(0, subtotal - promo_discount + delivery_fee);
  const order_number = await generateOrderNumber();

  const seller_id = await sellerIdFromProducts(input.items);

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number,
      seller_id,
      user_id: input.userId ?? null,
      customer_name: input.customerName,
      customer_email: input.customerEmail ?? null,
      status: "Pending",
      payment_status: input.paymentStatus ?? "Pending",
      delivery_status: "Pending",
      delivery_option: input.deliveryOption ?? null,
      subtotal,
      delivery_fee,
      total,
      notes: input.notes ?? null,
      promo_discount,
      seller_promo_id: input.sellerPromoId ?? null,
      platform_promo_id: input.platformPromoId ?? null,
    })
    .select()
    .single();

  if (orderError || !orderRow) {
    console.error("[ordersService] create order:", orderError?.message);
    return null;
  }

  const itemRows = input.items.map((item) => ({
    order_id: orderRow.id,
    product_id: item.productId ?? null,
    product_name: item.productName,
    product_category: item.productCategory,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.unitPrice * item.quantity,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) {
    console.error("[ordersService] create items:", itemsError.message);
    await supabase.from("orders").delete().eq("id", orderRow.id);
    return null;
  }

  return toSellerOrder(orderRow as DbOrderRow, itemRows as DbOrderItemRow[]);
}

export async function countOrders(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
