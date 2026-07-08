import { ImageSourcePropType } from "react-native";

export type ProductImageSourceInput = {
  id: string;
  imageKey?: string;
  imageUrl?: string | null;
};

/** Resolve bundled or remote product image. */
export function getProductImageSource(
  product: ProductImageSourceInput
): ImageSourcePropType | { uri: string } | undefined {
  if (product.imageUrl?.trim()) {
    return { uri: product.imageUrl.trim() };
  }
  return productImages[product.imageKey ?? product.id];
}

/** @deprecated Use getProductImageSource or ProductImageView */
export function getProductImage(product: ProductImageSourceInput): ImageSourcePropType | undefined {
  const source = getProductImageSource(product);
  if (!source || typeof source === "number") return source;
  if ("uri" in source) return undefined;
  return source;
}

export const productImages: Record<string, ImageSourcePropType> = {
  "sp-1": require("../../assets/images/store/sp-1.png"),
  "sp-2": require("../../assets/images/store/sp-2.png"),
  "sp-3": require("../../assets/images/store/sp-3.png"),
  "mr-1": require("../../assets/images/store/mr-1.png"),
  "mr-2": require("../../assets/images/store/mr-2.png"),
  "mr-3": require("../../assets/images/store/mr-3.png"),
  "cn-1": require("../../assets/images/store/cn-1.png"),
  "cn-2": require("../../assets/images/store/cn-2.png"),
  "cn-3": require("../../assets/images/store/cn-3.png"),
  "ss-1": require("../../assets/images/store/ss-1.png"),
  "ss-2": require("../../assets/images/store/ss-2.png"),
  "ss-3": require("../../assets/images/store/ss-3.png"),
  "sr-1": require("../../assets/images/store/sr-1.png"),
  "sr-2": require("../../assets/images/store/sr-2.png"),
  "sr-3": require("../../assets/images/store/sr-3.png"),
  "dv-1": require("../../assets/images/store/dv-1.png"),
  "dv-2": require("../../assets/images/store/dv-2.png"),
  "dv-3": require("../../assets/images/store/dv-3.png"),
};

export type ProductStockStatus = "Active" | "Low Stock" | "Out of Stock";
export type ProductApprovalStatus = "Approved" | "Pending" | "Rejected";

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  /** From Supabase when synced */
  stock?: number;
  status?: ProductStockStatus;
  approvalStatus?: ProductApprovalStatus;
  /** Supabase seller UUID when synced */
  sellerId?: string;
  /** Maps to productImages keys e.g. sp-1 */
  imageKey?: string;
  imageUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface StoreCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  products: StoreProduct[];
}

