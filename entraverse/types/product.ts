export interface ProductImage {
  url: string;
  alt?: string | null;
  is_primary?: boolean;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  description?: string | null;
  price: number;
  formatted_price?: string | null;
  stock?: number;
  main_image?: string | null;
  images?: ProductImage[];
  status?: "active" | "inactive" | "draft";
}

export interface VariantDefinition {
  id: string;
  name: string;
  options: string[];
  draftOption: string;
}

export interface VariantCombination {
  key: string;
  label: string;
  values: Record<string, string>;
}

export interface MatrixPricing {
  stock: number;
  purchasePrice: number;
  currency: "SGD" | "USD" | "AUD" | "EUR" | "IDR" | "CNY";
  exchangeRate: number;
  exchangeValue: number;
  shipping: "Udara" | "Laut" | "Darat";
  shippingCost: number;
  arrivalCost: number;
  marginPercent: number;
  offlinePrice: number;
  entraversePrice: number;
  tokopediaPrice: number;
  tokopediaFee: number;
  tiktokPrice: number;
  tiktokFee: number;
  shopeePrice: number;
  shopeeFee: number;
  skuSeller: string;
  itemWeight: number;
  avgSalesA: number;
  stockoutDateA: string;
  stockoutFactorA: string;
  avgSalesB: number;
  stockoutDateB: string;
  stockoutFactorB: string;
  avgDailyFinal: number;
  startDate: string;
  predictedInitialStock: number;
  leadTime: number;
  reorderPoint: number;
  need15Days: number;
  inTransitStock: number;
  nextProcurement: number;
  procurementStatus: "Normal" | "Low Stock" | "Out of Stock";
}

export type ShippingRates = Record<MatrixPricing["shipping"], number>;

export interface PhotoSlot {
  file: File | null;
  preview: string;
}

export interface ProductBasicInfo {
  name: string;
  slug: string;
  category: string;
  categoryId: string;
  brand: string;
  brandId: string;
  spu: string;
  status: "active" | "pending_approval" | "inactive";
  barcode: string;
}

export interface InventoryPlan {
  weight: number;
  length: number;
  width: number;
  height: number;
  volume: number;
  shippingRates: ShippingRates;
}

export interface ProductFormState {
  basic: ProductBasicInfo;
  description: string;
  inventoryPlan: InventoryPlan;
  tradeIn: boolean;
  photos: PhotoSlot[];
  variants: VariantDefinition[];
  matrix: Record<string, MatrixPricing>;
}

export interface MarginCalculation {
  profit: number;
  margin: number;
  isProfit: boolean;
}
