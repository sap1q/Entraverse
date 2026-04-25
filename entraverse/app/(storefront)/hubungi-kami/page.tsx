import type { Metadata } from "next";
import { ContactUsPageClient } from "./components/ContactUsPageClient";

export const metadata: Metadata = {
  title: "Hubungi Kami | Entraverse",
  description: "Terhubung dengan tim Entraverse untuk bantuan produk, pesanan, kerja sama, dan kebutuhan bisnis lainnya.",
};

export default function ContactUsPage() {
  return <ContactUsPageClient />;
}
