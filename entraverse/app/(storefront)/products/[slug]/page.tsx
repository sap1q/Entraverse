import type { Metadata } from "next";
import Link from "next/link";
import { productsApi } from "@/lib/api/products";
import { stripHtmlText, truncateText } from "@/lib/utils/formatter";
import type { Product, ProductDetail } from "@/types/product.types";
import { ProductBreadcrumb } from "./components/ProductBreadcrumb";
import { ProductDetailClient } from "./components/ProductDetailClient";

interface ProductDetailPageProps {
  params: {
    slug?: string;
  } | Promise<{
    slug?: string;
  }>;
}

const normalizeSlug = (value: unknown): string => {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const resolveParams = async (params: ProductDetailPageProps["params"]) => {
  return (await params) ?? {};
};

const toFallbackDetail = (product: Product): ProductDetail => {
  return {
    ...product,
    gallery: product.image ? [product.image] : ["/assets/images/hero/e-hero.png"],
    description: "",
    specifications: {},
    weight: 0,
    sku: product.slug.toUpperCase(),
    stock_status:
      product.stock > 5 ? "in_stock" : product.stock > 0 ? "low_stock" : "out_of_stock",
    min_order: 1,
    max_order: Math.max(1, product.stock),
    reviews_summary: {
      average_rating: product.rating || 0,
      total_count: 0,
      distribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
    },
    warranty: product.warranty,
    variants: product.variants,
    variant_pricing: product.variant_pricing,
  };
};

const resolveProductForPage = async (slug: unknown): Promise<ProductDetail | null> => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  const direct = await productsApi.getProductBySlug(normalizedSlug).catch(() => null);
  if (direct) return direct;

  const search = normalizedSlug.replace(/-/g, " ");
  const listing = await productsApi.getProducts({
    page: 1,
    per_page: 24,
    search,
  }).catch(() => null);

  if (!listing || listing.data.length === 0) return null;

  const exact = listing.data.find((item) => normalizeSlug(item.slug) === normalizedSlug);
  const fuzzy = listing.data.find((item) => {
    const itemSlug = normalizeSlug(item.slug);
    return normalizedSlug.startsWith(itemSlug) || itemSlug.startsWith(normalizedSlug);
  });
  const candidate = exact ?? fuzzy ?? listing.data[0];

  if (!candidate) return null;

  const detail = await productsApi.getProductBySlug(candidate.slug).catch(() => null);
  if (detail) return detail;

  return toFallbackDetail(candidate);
};

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const routeParams = await resolveParams(params);
  const product = await resolveProductForPage(routeParams.slug);

  if (!product) {
    return {
      title: "Produk Tidak Ditemukan - Entraverse",
      description: "Produk tidak ditemukan.",
    };
  }

  const plainDescription = stripHtmlText(product.description);

  return {
    title: `${product.name} - Entraverse`,
    description: truncateText(plainDescription, 160),
    openGraph: {
      title: `${product.name} - Entraverse`,
      description: truncateText(plainDescription, 160),
      images: product.gallery.length > 0 ? [product.gallery[0]] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const routeParams = await resolveParams(params);
  const safeSlug = normalizeSlug(routeParams.slug);
  const product = await resolveProductForPage(safeSlug);

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h1 className="text-2xl font-semibold text-slate-900">Produk belum bisa ditampilkan</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Data detail untuk slug <span className="font-semibold text-slate-800">{safeSlug || "-"}</span> belum tersedia
              dari sinkronisasi Mekari Jurnal. Coba buka daftar produk lalu pilih ulang produk yang sama.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Kembali ke daftar produk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ProductBreadcrumb category={product.category} productName={product.name} />
        <ProductDetailClient product={product} />
      </div>
    </div>
  );
}
