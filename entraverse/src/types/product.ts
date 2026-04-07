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
  currency: string;
  exchangeRate: number;
  exchangeValue: number;
  shipping: string;
  shippingCost: number;
  arrivalCost: number;
  offlinePrice: number;
  entraversePrice: number;
  tokopediaPrice: number;
  shopeePrice: number;
  skuSeller: string;
  itemWeight: number;
  avgSalesA: number;
  stockoutDateA: string;
  stockoutFactorA: string;
  avgSalesB: number;
  stockoutDateB: string;
  stockoutFactorB: string;
  avgDailyFinal: number;
  predictedInitialStock: number;
  leadTime: number;
  reorderPoint: number;
  need15Days: number;
  inTransitStock: number;
  nextProcurement: number;
  procurementStatus: string;
}

export interface PhotoSlot {
  file: File | null;
  preview: string;
}

export interface ProductBasicInfo {
  name: string;
  category: string;
  brand: string;
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
