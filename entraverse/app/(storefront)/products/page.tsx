import type { Metadata } from "next";
import { ProductListingPage } from "@/components/features/products/ProductListingPage";

export const metadata: Metadata = {
  title: "Produk Teknologi - Entraverse",
  description:
    "Temukan berbagai produk teknologi terbaru: VR, smart glasses, smart home, gaming, dan gadget elektronik lainnya di Entraverse.",
};

export default function ProductsPage() {
  return <ProductListingPage />;
}
