import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Trade-In Device | Entraverse",
  description: "Lengkapi kondisi perangkat untuk mendapatkan estimasi limit trade-in Entraverse.",
};

interface TradeInQuestionPageProps {
  searchParams?: Promise<{
    product_slug?: string;
    variant_sku?: string;
  }>;
}

export default async function TradeInQuestionPage({ searchParams }: TradeInQuestionPageProps) {
  const params = await searchParams;
  const productSlug = params?.product_slug?.trim();

  if (productSlug) {
    const query = new URLSearchParams();
    if (params?.variant_sku) {
      query.set("variant_sku", params.variant_sku);
    }

    redirect(`/trade-in/question/${productSlug}${query.size > 0 ? `?${query.toString()}` : ""}`);
  }

  redirect("/trade-in");
}
