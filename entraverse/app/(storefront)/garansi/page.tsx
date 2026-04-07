import type { Metadata } from "next";
import { WarrantyLookupClient } from "./components/WarrantyLookupClient";

export const metadata: Metadata = {
  title: "Garansi | Entraverse",
  description: "Halaman cek garansi produk Entraverse.",
};

export default function WarrantyPage() {
  return <WarrantyLookupClient />;
}
