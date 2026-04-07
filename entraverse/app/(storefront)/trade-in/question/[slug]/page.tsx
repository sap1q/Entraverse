import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productsApi } from "@/lib/api/products";
import { stripHtmlText, truncateText } from "@/lib/utils/formatter";
import { TradeInQuestionClient } from "../components/TradeInQuestionClient";

interface TradeInQuestionProductPageProps {
  params:
    | {
        slug?: string;
      }
    | Promise<{
        slug?: string;
      }>;
  searchParams?: Promise<{
    variant_sku?: string;
  }>;
}

const resolveParams = async (params: TradeInQuestionProductPageProps["params"]) => {
  return (await params) ?? {};
};

export async function generateMetadata({
  params,
}: TradeInQuestionProductPageProps): Promise<Metadata> {
  const routeParams = await resolveParams(params);
  const safeSlug = routeParams.slug?.trim();
  if (!safeSlug) {
    return {
      title: "Trade-In Device | Entraverse",
      description: "Lengkapi kondisi perangkat untuk mendapatkan estimasi limit trade-in Entraverse.",
    };
  }

  const product = await productsApi.getProductBySlug(safeSlug).catch(() => null);
  if (!product) {
    return {
      title: "Trade-In Device | Entraverse",
      description: "Lengkapi kondisi perangkat untuk mendapatkan estimasi limit trade-in Entraverse.",
    };
  }

  return {
    title: `Trade-In ${product.name} | Entraverse`,
    description: truncateText(stripHtmlText(product.description), 160),
  };
}

export default async function TradeInQuestionProductPage({
  params,
  searchParams,
}: TradeInQuestionProductPageProps) {
  const routeParams = await resolveParams(params);
  const safeSlug = routeParams.slug?.trim();
  if (!safeSlug) {
    notFound();
  }

  const product = await productsApi.getProductBySlug(safeSlug).catch(() => null);
  if (!product || !product.trade_in) {
    notFound();
  }

  const query = await searchParams;

  return (
    <TradeInQuestionClient
      product={product}
      selectedVariantSku={query?.variant_sku?.trim() || null}
    />
  );
}
