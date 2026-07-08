import { getSupabase } from "@/lib/supabase";
import type { StoreProduct } from "@/data/storeProducts";
import { fetchPlatformConfig } from "@/services/platformSettingsService";
import { productRowToStoreProduct, type DbProductRow } from "@/services/content/types";

export async function fetchProducts(): Promise<StoreProduct[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.from("products").select("*").order("name");

  if (error) {
    console.error("[productsService] fetch:", error.message);
    return [];
  }
  return ((data ?? []) as DbProductRow[]).map(productRowToStoreProduct);
}

export async function fetchProductsBySellerId(sellerId: string): Promise<StoreProduct[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", sellerId)
    .order("name");

  if (error) {
    console.error("[productsService] fetch by seller:", error.message);
    return [];
  }
  return ((data ?? []) as DbProductRow[]).map(productRowToStoreProduct);
}

export async function insertProduct(
  product: Omit<StoreProduct, "id"> & { id?: string; sellerId?: string | null },
  options?: { autoApproveProducts?: boolean }
): Promise<StoreProduct | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let approvalStatus = product.approvalStatus;
  if (!approvalStatus) {
    // Approved sellers' listings go live in the store immediately.
    if (product.sellerId) {
      approvalStatus = "Approved";
    } else {
      let autoApprove = options?.autoApproveProducts;
      if (autoApprove === undefined) {
        const config = await fetchPlatformConfig();
        autoApprove = config?.settings.autoApproveProducts ?? __DEV__;
      }
      approvalStatus = autoApprove ? "Approved" : "Pending";
    }
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      seller_id: product.sellerId ?? null,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock ?? 10,
      status: product.status ?? "Active",
      approval_status: approvalStatus,
      metadata: product.metadata ?? (product.imageKey ? { image_key: product.imageKey } : {}),
      image_url: product.imageUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[productsService] insert:", error.message);
    return null;
  }
  return productRowToStoreProduct(data as DbProductRow);
}

export async function updateProduct(
  id: string,
  updates: Partial<StoreProduct>
): Promise<StoreProduct | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.price !== undefined) patch.price = updates.price;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.stock !== undefined) patch.stock = updates.stock;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.approvalStatus !== undefined) patch.approval_status = updates.approvalStatus;
  if (updates.imageUrl !== undefined) patch.image_url = updates.imageUrl;

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[productsService] update:", error.message);
    return null;
  }
  return productRowToStoreProduct(data as DbProductRow);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) console.error("[productsService] delete:", error.message);
  return !error;
}

export async function countProducts(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
