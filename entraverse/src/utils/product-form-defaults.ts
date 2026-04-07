import type { MatrixPricing, ProductFormState } from "@/src/types/product";

export const INPUT_BASE_CLASS =
  "w-full rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white";

const MAX_PHOTOS = 5;

export const DEFAULT_MATRIX_ROW: MatrixPricing = {
  stock: 0,
  purchasePrice: 0,
  currency: "SGD",
  exchangeRate: 1,
  exchangeValue: 13338,
  shipping: "Laut",
  shippingCost: 0,
  arrivalCost: 0,
  offlinePrice: 0,
  entraversePrice: 0,
  tokopediaPrice: 0,
  shopeePrice: 0,
  skuSeller: "",
  itemWeight: 0,
  avgSalesA: 0,
  stockoutDateA: "-",
  stockoutFactorA: "-",
  avgSalesB: 0,
  stockoutDateB: "-",
  stockoutFactorB: "-",
  avgDailyFinal: 0,
  predictedInitialStock: 0,
  leadTime: 0,
  reorderPoint: 0,
  need15Days: 0,
  inTransitStock: 0,
  nextProcurement: 0,
  procurementStatus: "Normal",
};

export const createInitialProductForm = (): ProductFormState => ({
  basic: {
    name: "",
    category: "",
    brand: "",
    spu: "",
    status: "active",
    barcode: "",
  },
  description: "",
  inventoryPlan: { weight: 0, length: 0, width: 0, height: 0, volume: 0 },
  tradeIn: false,
  photos: Array.from({ length: MAX_PHOTOS }, () => ({ file: null, preview: "" })),
  variants: [{ id: crypto.randomUUID(), name: "Garansi", options: ["Tanpa Garansi"], draftOption: "" }],
  matrix: {},
});
