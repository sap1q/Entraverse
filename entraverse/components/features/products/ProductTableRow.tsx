"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Eye, Flame, Loader2, Star } from "lucide-react";
import JurnalSyncButton from "@/components/features/integrations/JurnalSyncButton";
import ProductActions from "@/components/features/products/ProductActions";

export type ProductStatus = "active" | "inactive" | "draft";
export type ProductStockStatus = "in_stock" | "out_of_stock" | "preorder";

type VariantPricingRow = {
  sku: string;
  label: string;
  stock: number;
  offlinePrice: number | null;
  entraversePrice: number | null;
  tiktokPrice: number | null;
  tokopediaPrice: number | null;
  shopeePrice: number | null;
};

export interface ProductTableRowProduct {
  id: string;
  name: string;
  slug: string;
  spu: string;
  brand?: string | null;
  jurnal_id?: string | null;
  jurnal_archived?: boolean;
  inventory?: {
    total_stock?: number;
  };
  photo: string;
  status: ProductStatus;
  stock_status: ProductStockStatus;
  is_featured: boolean;
  marketplaceSync: {
    tokopedia: boolean;
    tiktok: boolean;
    shopee: boolean;
  };
  variant_pricing?: VariantPricingRow[];
}

interface ProductTableRowProps {
  product: ProductTableRowProduct;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  isActionOpen: boolean;
  onActionOpenChange: (open: boolean) => void;
  onJurnalSyncComplete: () => void | Promise<void>;
  onToggleFeatured: (product: ProductTableRowProduct) => void | Promise<void>;
  onToggleStatus: (product: ProductTableRowProduct) => void | Promise<void>;
  isFeaturedUpdating?: boolean;
  isStatusUpdating?: boolean;
}

const statusStyle: Record<ProductStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border-slate-200 bg-slate-50 text-slate-600",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
};

const statusLabel: Record<ProductStatus, string> = {
  active: "Aktif",
  inactive: "Non Aktif",
  draft: "Draft",
};

const stockStatusStyle: Record<ProductStockStatus, string> = {
  in_stock: "border-emerald-200 bg-emerald-50 text-emerald-700",
  out_of_stock: "border-rose-200 bg-rose-50 text-rose-700",
  preorder: "border-sky-200 bg-sky-50 text-sky-700",
};

const stockStatusLabel: Record<ProductStockStatus, string> = {
  in_stock: "In Stock",
  out_of_stock: "Out of Stock",
  preorder: "Preorder",
};

const currencyFormatter = new Intl.NumberFormat("id-ID");
const formatPrice = (value: number | null | undefined) =>
  typeof value === "number" ? `Rp ${currencyFormatter.format(value)}` : "-";

const variantList = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const variantItem = {
  hidden: { opacity: 0, y: -6 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
    },
  },
};

type InlineSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  ariaLabel: string;
};

function InlineSwitch({ checked, disabled, onToggle, ariaLabel }: InlineSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
        checked
          ? "border-blue-500 bg-blue-600"
          : "border-slate-300 bg-slate-200"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

type MarketplaceBadgeProps = {
  name: "tokopedia" | "tiktok" | "shopee";
  active: boolean;
};

const marketplaceMeta: Record<
  MarketplaceBadgeProps["name"],
  {
    label: string;
    iconSrc: string;
    iconAlt: string;
    iconSize: number;
    iconClassName?: string;
  }
> = {
  tokopedia: {
    label: "Tokopedia",
    iconSrc: "/assets/images/icons/Tokopedia_Mascot.png",
    iconAlt: "Tokopedia",
    iconSize: 24,
    iconClassName: "object-contain",
  },
  tiktok: {
    label: "TikTok",
    iconSrc: "/assets/images/icons/tiktok.png",
    iconAlt: "TikTok",
    iconSize: 22,
    iconClassName: "object-contain",
  },
  shopee: {
    label: "Shopee",
    iconSrc: "/assets/images/icons/shopee-logo-40483.png",
    iconAlt: "Shopee",
    iconSize: 24,
    iconClassName: "object-contain",
  },
};

function MarketplaceBadge({ name, active }: MarketplaceBadgeProps) {
  const meta = marketplaceMeta[name];

  return (
    <span
      title={`${meta.label} ${active ? "aktif" : "belum aktif"}`}
      className="inline-flex h-8 min-w-[28px] items-center justify-center"
      aria-label={`${meta.label} ${active ? "aktif" : "belum aktif"}`}
    >
      <Image
        src={meta.iconSrc}
        alt={meta.iconAlt}
        width={meta.iconSize}
        height={meta.iconSize}
        className={`${meta.iconClassName ?? ""} ${active ? "opacity-100" : "opacity-40 grayscale"}`}
      />
    </span>
  );
}

export default function ProductTableRow({
  product,
  onEdit,
  onDelete,
  isExpanded,
  onToggleExpand,
  isActionOpen,
  onActionOpenChange,
  onJurnalSyncComplete,
  onToggleFeatured,
  onToggleStatus,
  isFeaturedUpdating = false,
  isStatusUpdating = false,
}: ProductTableRowProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const isOutOfStock = product.stock_status === "out_of_stock";
  const rowStateClass = product.is_featured
    ? "bg-amber-50/50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35),0_0_16px_rgba(251,191,36,0.15)]"
    : isExpanded
      ? "bg-blue-50/70"
      : "hover:bg-slate-50/80";

  return (
    <>
      <tr
        onClick={() => onToggleExpand(product.id)}
        className={`cursor-pointer transition ${rowStateClass}`}
      >
        <td className="border-b border-gray-100 px-3 py-4 align-top">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-100 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.photo || "/product-placeholder.svg"}
              alt={product.name}
              className={`h-full w-full object-cover transition ${isOutOfStock ? "grayscale opacity-45" : ""}`}
              loading="lazy"
              onError={(event) => {
                if (event.currentTarget.dataset.fallbackApplied === "1") return;
                event.currentTarget.dataset.fallbackApplied = "1";
                event.currentTarget.src = "/product-placeholder.svg";
              }}
            />
            {isOutOfStock ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-500/22">
                <span className="px-1 text-center text-[8px] font-black uppercase leading-none tracking-[0.16em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.32)]">
                  Stok Habis
                </span>
              </div>
            ) : null}
          </div>
        </td>

        <td className="border-b border-gray-100 px-3 py-4 align-top">
          <div className="flex items-start justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span>{product.name}</span>
              {product.is_featured ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Flame className="h-3 w-3" />
                  Featured
                </span>
              ) : null}
            </p>
            <motion.span
              initial={false}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="mt-0.5 inline-flex"
            >
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </motion.span>
          </div>
          <p className="mt-1 text-xs text-slate-500">SPU/SKU: {product.spu}</p>
          <p className="mt-1 text-xs text-slate-500">Brand: {product.brand ?? "-"}</p>
          <p className="mt-1 text-xs text-slate-500">Total Stok: {product.inventory?.total_stock ?? 0}</p>
        </td>

        <td className="border-b border-gray-100 px-3 py-4 align-middle">
          <div className="mx-auto flex max-w-[220px] flex-col items-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle[product.status]}`}
              >
                {statusLabel[product.status]}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${stockStatusStyle[product.stock_status]}`}
              >
                {stockStatusLabel[product.stock_status]}
              </span>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowStatusMenu((previous) => !previous);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {showStatusMenu ? "Sembunyikan toggle" : "Tampilkan toggle"}
              <motion.span
                initial={false}
                animate={{ rotate: showStatusMenu ? 180 : 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="inline-flex"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {showStatusMenu ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="w-full overflow-hidden"
                >
                  <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                      <span>Status Aktif</span>
                      <div className="flex items-center gap-1">
                        {isStatusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> : null}
                        <InlineSwitch
                          checked={product.status === "active"}
                          disabled={isStatusUpdating}
                          onToggle={() => onToggleStatus(product)}
                          ariaLabel={`Toggle status produk ${product.name}`}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        Featured
                      </span>
                      <div className="flex items-center gap-1">
                        {isFeaturedUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> : null}
                        <InlineSwitch
                          checked={product.is_featured}
                          disabled={isFeaturedUpdating}
                          onToggle={() => onToggleFeatured(product)}
                          ariaLabel={`Toggle featured produk ${product.name}`}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-2">
              <MarketplaceBadge name="tokopedia" active={product.marketplaceSync.tokopedia} />
              <MarketplaceBadge name="tiktok" active={product.marketplaceSync.tiktok} />
              <MarketplaceBadge name="shopee" active={product.marketplaceSync.shopee} />
              <Link
                href={`/products/${encodeURIComponent(product.slug)}`}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 transition hover:border-blue-300 hover:bg-blue-100"
                aria-label={`Lihat ${product.name} di storefront`}
                title="Lihat di storefront"
              >
                <Eye className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </td>

        <td className="border-b border-gray-100 px-3 py-4 align-middle">
          <div onClick={(event) => event.stopPropagation()} className="flex items-center justify-center gap-2">
            <ProductActions
              productId={product.id}
              productName={product.name}
              onEdit={onEdit}
              onDelete={(id) => onDelete(id, product.name)}
              isOpen={isActionOpen}
              onOpenChange={onActionOpenChange}
            />
            <JurnalSyncButton
              productId={product.id}
              initialArchived={Boolean(product.jurnal_archived)}
              onSyncComplete={onJurnalSyncComplete}
              onArchiveChange={() => onJurnalSyncComplete()}
            />
          </div>
        </td>
      </tr>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <tr className="bg-slate-50">
            <td colSpan={10} className="border-b border-gray-100 px-3 pb-4">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {product.variant_pricing?.length ?? 0} SKU tersedia
                    </p>
                    <p className="text-xs text-slate-500">Pantau stok dan harga jual offline setiap SKU.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-blue-200">
                          <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            SKU & Varian
                          </th>
                          <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Stok
                          </th>
                          <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Harga Offline
                          </th>
                          <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Harga Entraverse.id
                          </th>
                          <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Harga Tokopedia
                          </th>
                          <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Harga Shopee
                          </th>
                        </tr>
                      </thead>
                      <motion.tbody variants={variantList} initial="hidden" animate="show">
                        {product.variant_pricing?.map((variant, index) => (
                          <motion.tr
                            key={`${product.id}:${variant.sku}:${variant.label}:${index}`}
                            className="border-b border-blue-100/80"
                            variants={variantItem}
                          >
                            <td className="px-2 py-2.5">
                              <p className="text-xs font-semibold text-slate-700">{variant.sku}</p>
                              <p className="text-xs text-slate-500">{variant.label}</p>
                            </td>
                            <td className="px-2 py-2.5 text-xs text-slate-700">{variant.stock}</td>
                            <td className="px-2 py-2.5 text-xs text-slate-700">{formatPrice(variant.offlinePrice)}</td>
                            <td className="px-2 py-2.5 text-xs text-slate-700">{formatPrice(variant.entraversePrice)}</td>
                            <td className="px-2 py-2.5 text-xs text-slate-700">{formatPrice(variant.tokopediaPrice)}</td>
                            <td className="px-2 py-2.5 text-xs text-slate-700">{formatPrice(variant.shopeePrice)}</td>
                          </motion.tr>
                        ))}
                        {(product.variant_pricing?.length ?? 0) === 0 ? (
                          <motion.tr variants={variantItem}>
                            <td colSpan={6} className="px-2 py-3 text-xs text-slate-500">
                              Belum ada varian pada produk ini.
                            </td>
                          </motion.tr>
                        ) : null}
                      </motion.tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        ) : null}
      </AnimatePresence>
    </>
  );
}
