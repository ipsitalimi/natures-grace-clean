export type DeliveryOptionId = "standard" | "express" | "overnight";

export interface DeliveryOption {
  id: DeliveryOptionId;
  label: string;
  duration: string;
  price: number;
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  { id: "standard", label: "Standard Delivery", duration: "5-7 business days", price: 0 },
  { id: "express", label: "Express Delivery", duration: "2-3 business days", price: 4.99 },
  { id: "overnight", label: "Overnight Delivery", duration: "Next business day", price: 9.99 },
];

export const DELIVERY_LABELS: Record<string, string> = {
  standard: "Standard Delivery (5-7 business days)",
  express: "Express Delivery (2-3 business days)",
  overnight: "Overnight Delivery (Next business day)",
};

export function deliveryFeeForOption(optionId: string): number {
  return DELIVERY_OPTIONS.find((d) => d.id === optionId)?.price ?? 0;
}
