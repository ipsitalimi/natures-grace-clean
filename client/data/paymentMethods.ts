/** Saved payment method metadata (no sensitive card data). */

export interface PaymentMethod {
  id: string;
  userId: string;
  provider: string;
  providerTokenId: string;
  brand: string;
  last4: string;
  expiryLabel: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  createdAt: string;
}

/** UI card row shape (matches existing PaymentMethodsScreen). */
export interface PaymentMethodCardView {
  id: string;
  type: string;
  lastFour: string;
  expires: string;
  isDefault: boolean;
}

export interface AddPaymentMethodInput {
  brand: string;
  last4: string;
  expiryLabel: string;
  provider?: string;
  providerTokenId?: string;
  setAsDefault?: boolean;
}
