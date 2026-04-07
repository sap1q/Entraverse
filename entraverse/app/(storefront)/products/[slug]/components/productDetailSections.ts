import { formatDimension } from "@/lib/utils/formatter";
import type { ProductDetail } from "@/types/product.types";

export interface ProductDetailRow {
  label: string;
  value: string;
}

const humanizeKey = (value: string): string => {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const buildProductSpecificationRows = (product: ProductDetail): ProductDetailRow[] => {
  const baseRows: ProductDetailRow[] = [
    { label: "Brand", value: product.brand.name || "-" },
    { label: "Berat Produk", value: product.weight > 0 ? `${product.weight} gram` : "-" },
    { label: "SKU", value: product.sku || "-" },
    { label: "Dimensi", value: formatDimension(product.dimensions) },
    { label: "Barcode", value: product.barcode || "-" },
    { label: "Garansi", value: product.warranty || "-" },
  ];

  const technicalRows: ProductDetailRow[] = Object.entries(product.specifications ?? {})
    .map(([key, value]) => ({
      label: humanizeKey(key),
      value: String(value ?? "-").trim() || "-",
    }))
    .filter((item) => item.label.length > 0);

  return [...baseRows, ...technicalRows];
};
