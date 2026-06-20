import type { StoreProduct } from "@/data/storeProducts";
import type { SellerProduct } from "@/data/sellerMockData";

/** Maps unified store products to seller dashboard shape. Engagement fields are unused (no live tracking). */
export function toSellerProduct(p: StoreProduct): SellerProduct {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category,
    stock: p.stock ?? 0,
    status: p.status ?? "Active",
    imageUrl: p.imageUrl ?? null,
  };
}
