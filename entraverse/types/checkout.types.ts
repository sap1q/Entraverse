import type { ProductVariantPricingRow } from "@/types/product.types";

export interface CheckoutShippingOption {
  service: string;
  description: string | null;
  cost: number;
  etd: string | null;
  note: string | null;
}

export interface ShippingCostResult {
  courier: string;
  destinationCityId: string;
  destinationDistrictId: string | null;
  itemWeight: number;
  packagingWeight: number;
  weight: number;
  strictMode: boolean;
  options: CheckoutShippingOption[];
}

export interface CheckoutProcessItemPayload {
  product_id: string;
  quantity: number;
  variant_sku?: string;
  variants?: Record<string, string>;
  trade_in_enabled?: boolean;
  trade_in_transaction_id?: string;
}

export interface ShippingCostPayload {
  courier: string;
  address_id?: string;
  city_id?: string;
  district_id?: string;
  weight?: number;
  items?: CheckoutProcessItemPayload[];
}

export interface CheckoutProcessPayload {
  address_id?: string;
  courier?: string;
  service?: string;
  notes?: string;
  trade_in_discount?: number;
  items: CheckoutProcessItemPayload[];
}

export interface CheckoutOrderItem {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  variantSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  shippingCourier: string | null;
  shippingService: string | null;
  shippingEtd: string | null;
  shippingWeight: number;
  items: CheckoutOrderItem[];
}

export interface CheckoutTradeInTransactionSummary {
  id: string;
  transactionNumber: string;
  status: string;
  tradeInOnly: boolean;
  estimatedAmount: number;
  requestedProductName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CheckoutProcessResult {
  entryKind: "sales_order" | "trade_in";
  requiresPayment: boolean;
  order: CheckoutOrder;
  tradeInTransactions: CheckoutTradeInTransactionSummary[];
  snapToken: string;
  snapRedirectUrl: string | null;
  midtransClientKey: string;
  midtransSnapJsUrl: string;
  shipping: CheckoutShippingOption;
  shippingWeight: number;
}

export interface ProductSnapshot {
  id: string;
  name: string;
  price: number;
  stock: number;
  weight: number;
  image: string;
  variant_pricing: ProductVariantPricingRow[];
}
