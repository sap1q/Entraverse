"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api, { isAxiosError } from "@/lib/axios";
import { resolveApiOriginUrl } from "@/lib/api-config";

type ThumbnailKind =
  | "speaker"
  | "display"
  | "tablet"
  | "game"
  | "controller"
  | "portal"
  | "no-image";

type ProcurementPlan = {
  isoDate: string;
  dateLabel: string;
  deadlineLabel: string;
};

type ProcurementDocumentType = "purchase-quotation" | "purchase-order";

type ProcurementItem = {
  id: string;
  sku: string;
  productName: string;
  variant: string;
  periodLines: [string, string];
  quantity: string;
  thumbnailKind: ThumbnailKind;
  imageUrl: string;
};

type CatalogProduct = {
  id: string;
  sku: string;
  productName: string;
  variant: string;
  thumbnailKind: ThumbnailKind;
  imageUrl: string;
};

type AdminApiProduct = {
  id: string;
  name?: string | null;
  spu?: string | null;
  photos?: unknown[] | null;
  main_image?: string | null;
  image?: string | null;
  variant_pricing?: Array<Record<string, unknown>> | null;
};

const ITEMS_PER_PAGE = 15;

const procurementPlans: ProcurementPlan[] = [
  {
    isoDate: "2026-03-28",
    dateLabel: "Sabtu, 28 Maret 2026",
    deadlineLabel: "Deadline lewat",
  },
  {
    isoDate: "2026-03-13",
    dateLabel: "Jumat, 13 Maret 2026",
    deadlineLabel: "Deadline lewat",
  },
];

const initialProcurementRowsByPlan = Object.fromEntries(
  procurementPlans.map((plan) => [plan.isoDate, [] as ProcurementItem[]])
) as Record<string, ProcurementItem[]>;

const inferThumbnailKind = (name: string): ThumbnailKind => {
  const normalized = name.toLowerCase();
  if (normalized.includes("echo") || normalized.includes("speaker")) return "speaker";
  if (normalized.includes("show") || normalized.includes("display")) return "display";
  if (normalized.includes("kindle") || normalized.includes("tablet") || normalized.includes("switch oled")) return "tablet";
  if (normalized.includes("portal")) return "portal";
  if (normalized.includes("controller") || normalized.includes("dualsense")) return "controller";
  if (normalized.includes("disc") || normalized.includes("cartridge")) return "game";
  return "no-image";
};

const toStringValue = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeProductImageUrl = (value: unknown): string => {
  const raw = toStringValue(value);
  if (!raw) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return resolveApiOriginUrl(raw);
  return resolveApiOriginUrl(`/storage/products/${raw}`);
};

const extractPrimaryImageUrl = (product: AdminApiProduct): string => {
  const mainImage =
    normalizeProductImageUrl(product.main_image) ||
    normalizeProductImageUrl(product.image);

  if (mainImage) return mainImage;

  const photos = Array.isArray(product.photos) ? product.photos : [];

  for (const photo of photos) {
    if (typeof photo === "string") {
      const normalized = normalizeProductImageUrl(photo);
      if (normalized) return normalized;
      continue;
    }

    if (photo && typeof photo === "object") {
      const candidate = normalizeProductImageUrl((photo as { url?: unknown }).url);
      if (candidate) return candidate;
    }
  }

  return "";
};

const extractVariantLabel = (variants: Array<Record<string, unknown>> | null | undefined): string => {
  const firstVariant = Array.isArray(variants) ? variants[0] : null;
  if (!firstVariant) return "Varian default";

  return (
    toStringValue(firstVariant.label) ||
    toStringValue(firstVariant.variant_name) ||
    toStringValue(firstVariant.code) ||
    "Varian default"
  );
};

const extractSku = (product: AdminApiProduct): string => {
  const firstVariant = Array.isArray(product.variant_pricing) ? product.variant_pricing[0] : null;
  return (
    toStringValue(firstVariant?.sku) ||
    toStringValue(firstVariant?.variant_code) ||
    toStringValue(product.spu) ||
    toStringValue(product.id)
  );
};

const mapAdminProductToCatalogProduct = (product: AdminApiProduct): CatalogProduct => {
  const productName = toStringValue(product.name) || "Produk";

  return {
    id: toStringValue(product.id) || productName,
    sku: extractSku(product),
    productName,
    variant: extractVariantLabel(product.variant_pricing),
    thumbnailKind: inferThumbnailKind(productName),
    imageUrl: extractPrimaryImageUrl(product),
  };
};

const extractAdminProductRows = (payload: unknown): AdminApiProduct[] => {
  if (Array.isArray(payload)) return payload as AdminApiProduct[];

  if (payload && typeof payload === "object") {
    const source = payload as {
      data?: unknown[] | { data?: unknown[] };
    };

    if (Array.isArray(source.data)) {
      return source.data as AdminApiProduct[];
    }

    if (source.data && typeof source.data === "object" && Array.isArray(source.data.data)) {
      return source.data.data as AdminApiProduct[];
    }
  }

  return [];
};

const extractAdminLastPage = (payload: unknown): number => {
  if (!payload || typeof payload !== "object") return 1;

  const source = payload as {
    meta?: { last_page?: number | string };
    data?: { meta?: { last_page?: number | string } };
  };

  const directLastPage = Number(source.meta?.last_page ?? 1);
  if (Number.isFinite(directLastPage) && directLastPage > 0) return directLastPage;

  const nestedLastPage = Number(source.data?.meta?.last_page ?? 1);
  if (Number.isFinite(nestedLastPage) && nestedLastPage > 0) return nestedLastPage;

  return 1;
};

const buildPaginationNumbers = (currentPage: number, totalPages: number): number[] => {
  if (totalPages <= 1) return [1];

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
};

const procurementSteps = [
  "Pengadaan dibeli",
  "Pengumuman pemenang",
  "Barang dikirim",
  "Barang diinspeksi",
  "Barang diterima",
];

const procurementCompanyName = "ENTRAVERSE TEKNOLOGI INDONESIA";

const procurementDocumentMeta: Array<{
  type: ProcurementDocumentType;
  title: string;
  description: string;
}> = [
  {
    type: "purchase-quotation",
    title: "Purchase Quotation",
    description: "Ringkasan permintaan penawaran untuk supplier.",
  },
  {
    type: "purchase-order",
    title: "Purchase Order",
    description: "Draft pemesanan barang berdasarkan rencana pengadaan.",
  },
];

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildProcurementDocumentReference = (
  type: ProcurementDocumentType,
  procurementDate: string
): string => {
  const code = type === "purchase-quotation" ? "PQ" : "PO";
  return `${code}-${procurementDate.replaceAll("-", "")}`;
};

const buildProcurementDocumentHtml = (params: {
  type: ProcurementDocumentType;
  procurementDate: string;
  procurementDateLabel: string;
  rows: ProcurementItem[];
}): string => {
  const title =
    params.type === "purchase-quotation" ? "Purchase Quotation" : "Purchase Order";
  const subtitle =
    params.type === "purchase-quotation"
      ? "Dokumen permintaan penawaran supplier"
      : "Dokumen pemesanan barang";
  const reference = buildProcurementDocumentReference(
    params.type,
    params.procurementDate
  );

  const rowsMarkup = params.rows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.sku)}</td>
          <td>${escapeHtml(row.productName)}</td>
          <td>${escapeHtml(row.variant)}</td>
          <td>${escapeHtml(row.periodLines.join(" "))}</td>
          <td>${escapeHtml(row.quantity)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #1f2a44;
            background: #f7f9ff;
          }
          .sheet {
            width: 100%;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #dfe7ff;
            border-radius: 24px;
            padding: 28px;
          }
          .topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            border-bottom: 1px solid #e8eeff;
            padding-bottom: 18px;
          }
          .company {
            font-size: 26px;
            font-weight: 800;
            line-height: 1.15;
            letter-spacing: -0.03em;
          }
          .meta {
            text-align: right;
            color: #607091;
            font-size: 13px;
            line-height: 1.6;
          }
          .meta strong {
            display: block;
            color: #1f2a44;
            font-size: 14px;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            background: #eef3ff;
            color: #4f67aa;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 700;
          }
          h1 {
            margin: 22px 0 6px;
            font-size: 28px;
            line-height: 1.1;
            letter-spacing: -0.03em;
          }
          .subtitle {
            margin: 0;
            color: #7281a1;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
            overflow: hidden;
            border-radius: 18px;
            border: 1px solid #e1e9ff;
          }
          thead th {
            background: #eef3ff;
            color: #55688f;
            font-size: 12px;
            font-weight: 700;
            text-align: left;
            padding: 12px 14px;
          }
          tbody td {
            border-top: 1px solid #ebf0ff;
            padding: 14px;
            font-size: 13px;
            vertical-align: top;
          }
          .footer {
            margin-top: 18px;
            display: flex;
            justify-content: space-between;
            gap: 18px;
            color: #667695;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="topbar">
            <div>
              <div class="company">${escapeHtml(procurementCompanyName)}</div>
              <h1>${escapeHtml(title)}</h1>
              <p class="subtitle">${escapeHtml(subtitle)}</p>
            </div>
            <div class="meta">
              <span class="badge">${escapeHtml(reference)}</span>
              <strong>${escapeHtml(params.procurementDateLabel)}</strong>
              Periode pengadaan ${escapeHtml(params.procurementDate)}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:60px;">No</th>
                <th>SKU</th>
                <th>Produk</th>
                <th>Varian</th>
                <th>Periode</th>
                <th style="width:120px;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup}
            </tbody>
          </table>
          <div class="footer">
            <span>Total item: ${params.rows.length}</span>
            <span>Dokumen dibuat otomatis dari panel procurement Entraverse.</span>
          </div>
        </div>
      </body>
    </html>
  `;
};

function ProcurementThumbnail({ kind, imageUrl, alt }: { kind: ThumbnailKind; imageUrl?: string; alt?: string }) {
  const labelMap: Record<ThumbnailKind, string> = {
    speaker: "SP",
    display: "DS",
    tablet: "TB",
    game: "GM",
    controller: "CT",
    portal: "PT",
    "no-image": "--",
  };

  if (imageUrl) {
    return (
      <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[14px] border border-[#D8E3FF] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt ?? "Product image"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-[#D8E3FF] bg-[#F7F9FF] text-[11px] font-semibold tracking-[0.06em] text-[#7B8CB5]">
      {labelMap[kind]}
    </div>
  );
}

function ProcurementTimeline() {
  return (
    <div className="mt-3">
      <div className="grid grid-cols-5 gap-1.5">
        {procurementSteps.map((step, index) => (
          <div key={step} className="relative h-[10px]">
            <span className={`absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full ${index === 0 ? "bg-[#8AA4FF]" : "bg-[#DCE5FF]"}`} />
            <span className="absolute left-1/2 top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#B5C6FF]" />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5 text-[10px] font-semibold text-[#52617E]">
        {procurementSteps.map((step) => <p key={step} className="truncate text-center leading-tight whitespace-nowrap">{step}</p>)}
      </div>
    </div>
  );
}

function ProcurementAddModal(props: {
  open: boolean;
  procurementDate: string;
  search: string;
  products: CatalogProduct[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  pageNumbers: number[];
  quantities: Record<string, string>;
  onSearchChange: (value: string) => void;
  onQuantityChange: (productId: string, value: string) => void;
  onAdd: (product: CatalogProduct) => void;
  onClose: () => void;
  onPageChange: (page: number) => void;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(29,38,66,0.42)] px-3 py-3 sm:px-6 sm:py-6">
      <div className="flex h-[min(820px,calc(100vh-24px))] w-full max-w-[1124px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_28px_90px_rgba(16,24,40,0.22)] sm:h-[min(820px,calc(100vh-48px))] sm:rounded-[28px]">
        <div className="flex min-h-0 flex-1 flex-col px-8 pb-4 pt-6">
          <div className="flex items-start justify-between gap-6">
            <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#202B43]">Tambah produk ke pengadaan {props.procurementDate}</h2>
            <button type="button" onClick={props.onClose} className="inline-flex h-[56px] w-[56px] items-center justify-center rounded-[18px] border border-[#C9D7FF] bg-[#EEF3FF] text-[#202B43]" aria-label="Tutup modal"><X className="h-6 w-6" /></button>
          </div>
          <div className="mt-5">
            <p className="text-[16px] font-semibold text-[#202B43]">Cari produk</p>
            <label className="relative mt-3 block">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#95A3C5]"><Search className="h-5 w-5" /></span>
              <input value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} type="text" placeholder="Ketik nama produk" className="h-[60px] w-full rounded-[16px] border border-[#4F79FF] bg-white pl-12 pr-4 text-[16px] text-[#202B43] outline-none shadow-[0_0_0_4px_rgba(79,121,255,0.16)] placeholder:text-[#8A94A8]" />
            </label>
          </div>
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-[#E3E9FF]">
            <div className="thin-scrollbar overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[minmax(260px,2.1fr)_170px_1.3fr_170px_84px] gap-4 bg-[#EDF1FF] px-4 py-4 text-[15px] font-semibold text-[#5B6B92]">
                  <p>Produk</p><p>SKU</p><p>Varian</p><p>Stok dibutuhkan</p><p className="text-center">Aksi</p>
                </div>
              </div>
            </div>
            <div className="thin-scrollbar min-h-0 flex-1 overflow-auto bg-white">
              <div className="min-w-[860px]">
              {props.loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`catalog-skeleton-${index}`}
                    className="grid grid-cols-[minmax(260px,2.1fr)_170px_1.3fr_170px_84px] gap-4 border-t border-[#E8EEFF] px-4 py-4 first:border-t-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-[52px] w-[52px] animate-pulse rounded-[14px] bg-[#EEF2FF]" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-4/5 animate-pulse rounded bg-[#EEF2FF]" />
                        <div className="h-4 w-3/5 animate-pulse rounded bg-[#F3F6FF]" />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="h-4 w-24 animate-pulse rounded bg-[#EEF2FF]" />
                    </div>
                    <div className="flex items-center">
                      <div className="h-4 w-28 animate-pulse rounded bg-[#EEF2FF]" />
                    </div>
                    <div className="flex items-center">
                      <div className="h-[52px] w-[172px] animate-pulse rounded-[14px] bg-[#EEF2FF]" />
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="h-[52px] w-[52px] animate-pulse rounded-[18px] bg-[#DDE7FF]" />
                    </div>
                  </div>
                ))
              ) : props.error ? (
                <div className="px-4 py-10 text-center text-[14px] text-rose-600">{props.error}</div>
              ) : props.products.length > 0 ? props.products.map((product) => (
                <div key={product.id} className="grid grid-cols-[minmax(260px,2.1fr)_170px_1.3fr_170px_84px] gap-4 border-t border-[#E8EEFF] px-4 py-4 text-[#202B43] first:border-t-0">
                  <div className="flex items-center gap-4"><ProcurementThumbnail kind={product.thumbnailKind} imageUrl={product.imageUrl} alt={product.productName} /><p className="text-[14px] leading-[1.35]">{product.productName}</p></div>
                  <div className="flex items-center text-[14px]">{product.sku}</div>
                  <div className="flex items-center text-[14px] text-[#3D4A69]">{product.variant}</div>
                  <div className="flex items-center"><input type="number" min={1} value={props.quantities[product.id] ?? "1"} onChange={(event) => props.onQuantityChange(product.id, event.target.value)} className="h-[52px] w-[172px] rounded-[14px] border border-[#D5E1FF] bg-white px-4 text-[16px] text-[#202B43] outline-none" /></div>
                  <div className="flex items-center justify-center"><button type="button" onClick={() => props.onAdd(product)} className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#5E75FF_0%,#4A60E6_100%)] text-white shadow-[0_12px_28px_rgba(74,96,230,0.28)]" aria-label={`Tambah ${product.productName}`}><Plus className="h-6 w-6" /></button></div>
                </div>
              )) : <div className="px-4 py-10 text-center text-[14px] text-[#7B87A6]">Tidak ada produk yang cocok dengan pencarian.</div>}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-[16px] border border-[#E6ECFF] bg-[#FBFCFF] px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-[14px] text-[#617091]">
                Menampilkan {props.products.length} produk, halaman {props.page} dari {props.totalPages}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => props.onPageChange(Math.max(1, props.page - 1))} disabled={props.page === 1} className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[14px] border border-[#D6DFF6] bg-white text-[#202B43] disabled:cursor-not-allowed disabled:text-[#A1ABC1]"><ChevronLeft className="h-5 w-5" /></button>
                <div className="flex flex-wrap items-center gap-2">
                  {props.pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => props.onPageChange(pageNumber)}
                      className={`inline-flex h-[40px] min-w-[40px] items-center justify-center rounded-[12px] border px-3 text-[14px] font-semibold transition ${
                        pageNumber === props.page
                          ? "border-[#4F79FF] bg-[#E8EEFF] text-[#3152D9]"
                          : "border-[#D6DFF6] bg-white text-[#617091]"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>
                <p className="min-w-[104px] text-center text-[14px] font-medium text-[#617091]">Halaman {props.page} / {props.totalPages}</p>
                <button type="button" onClick={() => props.onPageChange(Math.min(props.totalPages, props.page + 1))} disabled={props.page === props.totalPages} className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[14px] border border-[#D6DFF6] bg-white text-[#202B43] disabled:cursor-not-allowed disabled:text-[#A1ABC1]"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcurementDocumentsModal(props: {
  open: boolean;
  procurementDate: string;
  procurementDateLabel: string;
  rows: ProcurementItem[];
  activeType: ProcurementDocumentType;
  onSelectType: (type: ProcurementDocumentType) => void;
  onDownload: (type: ProcurementDocumentType) => void;
  onClose: () => void;
}) {
  if (!props.open) return null;

  const selectedDocument =
    procurementDocumentMeta.find((document) => document.type === props.activeType) ??
    procurementDocumentMeta[0];
  const previewHtml =
    props.rows.length > 0
      ? buildProcurementDocumentHtml({
          type: selectedDocument.type,
          procurementDate: props.procurementDate,
          procurementDateLabel: props.procurementDateLabel,
          rows: props.rows,
        })
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(29,38,66,0.42)] px-3 py-3 sm:px-6 sm:py-6">
      <div className="flex h-[min(760px,calc(100vh-24px))] w-full max-w-[1130px] flex-col overflow-hidden rounded-[24px] border border-[#DCE5FF] bg-white shadow-[0_28px_90px_rgba(16,24,40,0.22)] sm:h-[min(760px,calc(100vh-48px))] sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-4 border-b border-[#E4EBFF] px-7 py-6 sm:px-8">
          <h2 className="text-[24px] font-bold tracking-[-0.03em] text-[#17243F] sm:text-[28px]">
            Dokumen Pengadaan
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-[52px] min-w-[120px] items-center justify-center rounded-[14px] border border-[#C6D6FF] bg-[#EDF3FF] px-5 text-[16px] font-semibold text-[#17243F]"
          >
            Tutup
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 px-7 py-6 sm:grid-cols-[320px_minmax(0,1fr)] sm:px-8">
          <aside className="flex min-h-0 flex-col">
            <div className="rounded-[22px] bg-white">
              <p className="text-[18px] leading-[1.35] text-[#66779B]">
                Dokumen pengadaan untuk {props.procurementDateLabel}.
              </p>
              <p className="mt-5 max-w-[180px] text-[18px] font-bold uppercase leading-[1.4] tracking-[-0.02em] text-[#202B43]">
                {procurementCompanyName}
              </p>
              <p className="mt-3 text-[14px] leading-6 text-[#6A7BA0]">
                {buildProcurementDocumentReference(props.activeType, props.procurementDate)}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {procurementDocumentMeta.map((document) => {
                const available = props.rows.length > 0;
                const selected = document.type === props.activeType;

                return (
                  <button
                    key={document.type}
                    type="button"
                    onClick={() => props.onSelectType(document.type)}
                    className={`flex w-full items-center gap-4 rounded-[20px] border border-dashed px-4 py-4 text-left transition ${
                      selected
                        ? "border-[#9FB8FF] bg-[#F5F8FF] shadow-[0_12px_28px_rgba(133,155,214,0.14)]"
                        : "border-[#D7E2FF] bg-[#FBFCFF]"
                    }`}
                  >
                    <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[16px] border border-[#DCE6FF] bg-white text-[#FF5A55]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[#202B43]">
                        {document.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-[#7B89A7]">
                        {available ? document.description : "Dokumen belum tersedia"}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-white px-3 py-2 text-[13px] font-semibold text-[#7E8BA6]">
                      {available ? "Tersedia" : "Tidak tersedia"}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#D8E4FF] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-[#D9E4FF] bg-[#EEF3FF] px-5 py-4">
              <h3 className="text-[18px] font-bold tracking-[-0.02em] text-[#202B43]">
                Pratinjau dokumen
              </h3>

              <div className="group relative">
                <button
                  type="button"
                  onClick={() => props.onDownload(selectedDocument.type)}
                  disabled={props.rows.length === 0}
                  title="Unduh Dokumen Pengadaan"
                  aria-label="Unduh Dokumen Pengadaan"
                  className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#8CA1F4_0%,#7B93E9_100%)] text-white shadow-[0_14px_30px_rgba(99,122,214,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#C8D4F8] disabled:text-white/70 disabled:shadow-none"
                >
                  <Download className="h-5 w-5" />
                </button>
                <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden whitespace-nowrap rounded-xl bg-[#1E2A45] px-3 py-2 text-[12px] font-medium text-white shadow-[0_12px_28px_rgba(16,24,40,0.22)] group-hover:flex">
                  Unduh Dokumen Pengadaan
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 bg-white">
              {props.rows.length > 0 ? (
                <iframe
                  title={`Pratinjau ${selectedDocument.title}`}
                  srcDoc={previewHtml}
                  className="h-full min-h-[360px] w-full border-0 bg-white"
                />
              ) : (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#D8E3FF] bg-[#F7F9FF] text-[#8EA0C9]">
                    <FileText className="h-7 w-7" />
                  </div>
                  <p className="mt-5 text-[18px] font-semibold text-[#2B3959]">
                    Dokumen belum tersedia
                  </p>
                  <p className="mt-2 max-w-[360px] text-[14px] leading-6 text-[#7B89A7]">
                    Tambahkan produk ke pengadaan terlebih dahulu agar pratinjau dan unduhan dokumen bisa dibuat.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ProcurementExpandedPanel(props: {
  rows: ProcurementItem[];
  onRemove: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenDocumentModal: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#D6E2FF] bg-white">
      <div className="px-0">
        {props.rows.length > 0 ? props.rows.map((row, index) => (
          <div key={row.id} className={`grid min-h-[74px] gap-x-4 gap-y-3 px-5 py-3 md:grid-cols-[64px_150px_minmax(0,2.7fr)_170px_90px_48px_minmax(160px,1.2fr)] md:items-center ${index < props.rows.length - 1 ? "border-b border-[#DCE5FF]" : ""} bg-white`}>
            <div><ProcurementThumbnail kind={row.thumbnailKind} imageUrl={row.imageUrl} alt={row.productName} /></div>
            <p className="truncate whitespace-nowrap text-[13px] leading-[1.25] tracking-[-0.01em] text-[#0D1B3B]">{row.sku}</p>
            <div className="min-w-0">
              <p className="truncate whitespace-nowrap text-[13px] leading-[1.25] tracking-[-0.01em] text-[#0D1B3B]">{row.productName}</p>
              <p className="mt-1 truncate whitespace-nowrap text-[11px] leading-[1.2] text-[#5E6F97]">{row.variant}</p>
            </div>
            <p className="justify-self-end text-right text-[13px] leading-[1.3] tracking-[-0.01em] text-[#0D1B3B]">{row.periodLines.map((line, lineIndex) => <span key={`${row.id}-period-${lineIndex}`} className="block whitespace-nowrap">{line}</span>)}</p>
            <div className="flex h-[40px] w-[74px] items-center rounded-[12px] border border-[#D5E1FF] bg-white px-4 text-[13px] text-[#0D1B3B]">{row.quantity}</div>
            <button type="button" onClick={() => props.onRemove(row.id)} className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[12px] border border-[#F0E5E2] bg-[#FFF6F4] text-[#9AA4B6]"><Trash2 className="h-[15px] w-[15px]" /></button>
            <p className="truncate whitespace-nowrap text-[12px] leading-[1.25] text-[#5E6F97]">Belum ada penawaran.</p>
          </div>
        )) : (
          <div className="flex min-h-[152px] flex-col items-center justify-center bg-white px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D8E3FF] bg-[#F7F9FF] text-[#8FA0C7]">
              <Plus className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[15px] font-semibold text-[#30405F]">Pengadaan masih kosong</p>
            <p className="mt-1 max-w-[420px] text-[13px] leading-6 text-[#7D8BA9]">
              Belum ada produk pada periode ini. Tambahkan produk dari master produk untuk mulai menyusun pengadaan.
            </p>
          </div>
        )}
      </div>
      <div className="border-t border-[#D6E2FF] bg-[#E9EEFF] px-5 py-[14px]">
        <div className="grid gap-[10px] md:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={props.onOpenAddModal} className="inline-flex h-[48px] w-full items-center justify-center rounded-[12px] border border-[#B9CBFF] bg-[#DDE7FF] px-4 text-[14px] font-semibold text-[#0D1B3B]">Tambah produk</button>
          <button type="button" className="inline-flex h-[48px] w-full items-center justify-center rounded-[12px] border border-[#CCD8F8] bg-[#E6ECFA] px-4 text-[14px] font-semibold text-[#66738E]">Lihat pengiriman</button>
          <button type="button" onClick={props.onOpenDocumentModal} className="inline-flex h-[48px] w-full items-center justify-center rounded-[12px] border border-[#B9CBFF] bg-[#DDE7FF] px-4 text-[14px] font-semibold text-[#0D1B3B]">Lihat dokumen pengadaan</button>
          <button type="button" className="inline-flex h-[48px] w-full items-center justify-center rounded-[12px] border border-[#CCD8F8] bg-[#E6ECFA] px-4 text-[14px] font-semibold text-[#66738E]">Inspeksi &amp; Terima Barang</button>
        </div>
      </div>
    </div>
  );
}

function ProcurementRow(props: {
  plan: ProcurementPlan;
  expanded: boolean;
  rows: ProcurementItem[];
  onToggle: () => void;
  onRemove: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenDocumentModal: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[#DDE6FF] bg-[#EEF3FF] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-bold tracking-[-0.02em] text-[#1E2F57]">{props.plan.dateLabel}</h3>
          <p className="mt-1 text-[13px] font-semibold text-[#506180]">{props.rows.length} item</p>
          <p className="text-[13px] font-semibold text-[#FF6A55]">{props.plan.deadlineLabel}</p>
          <ProcurementTimeline />
        </div>
        <button type="button" onClick={props.onToggle} className="mt-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#CDD9FF] bg-[#F6F8FF] text-[#7082AB]"><ChevronRight className={`h-4 w-4 transition-transform ${props.expanded ? "rotate-90" : ""}`} /></button>
      </div>
      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out ${
          props.expanded
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`transition-[transform,opacity] duration-300 ease-out ${
              props.expanded
                ? "translate-y-0 opacity-100"
                : "-translate-y-2 opacity-0"
            }`}
          >
            <ProcurementExpandedPanel
              rows={props.rows}
              onRemove={props.onRemove}
              onOpenAddModal={props.onOpenAddModal}
              onOpenDocumentModal={props.onOpenDocumentModal}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ProcurementPage() {
  const [expandedPlanIsoDate, setExpandedPlanIsoDate] = useState("");
  const [procurementRowsByPlan, setProcurementRowsByPlan] = useState(initialProcurementRowsByPlan);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [activeProcurementDate, setActiveProcurementDate] = useState(procurementPlans[0].isoDate);
  const [activeDocumentType, setActiveDocumentType] =
    useState<ProcurementDocumentType>("purchase-quotation");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [masterCatalogProducts, setMasterCatalogProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAddModalOpen) return;

    let mounted = true;
    setCatalogPage(1);

    const fetchMasterProducts = async () => {
      setCatalogLoading(true);
      setCatalogError(null);

      try {
        const collected: CatalogProduct[] = [];
        let currentPage = 1;
        let lastPage = 1;

        do {
          const response = await api.get("/v1/admin/products", {
            params: {
              page: currentPage,
              per_page: 100,
            },
          });

          const payload = response.data;
          const rows = extractAdminProductRows(payload);

          collected.push(
            ...rows
              .map((row) => mapAdminProductToCatalogProduct(row))
              .filter((row) => row.productName.length > 0)
          );

          lastPage = extractAdminLastPage(payload);
          currentPage += 1;
        } while (currentPage <= lastPage && currentPage <= 20);

        if (!mounted) return;

        const deduped = Array.from(
          new Map(collected.map((item) => [`${item.id}:${item.sku}`, item])).values()
        ).sort((left, right) =>
          left.productName.localeCompare(right.productName, "id", { sensitivity: "base" })
        );

        setMasterCatalogProducts(deduped);
      } catch (error) {
        if (!mounted) return;

        if (isAxiosError(error)) {
          setCatalogError(
            (typeof error.response?.data?.message === "string" && error.response.data.message) ||
              "Gagal memuat produk dari master produk."
          );
        } else {
          setCatalogError("Gagal memuat produk dari master produk.");
        }
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    };

    void fetchMasterProducts();

    return () => {
      mounted = false;
    };
  }, [isAddModalOpen]);

  const normalizedSearch = catalogSearch.trim().toLowerCase();
  const filteredCatalogProducts = [...masterCatalogProducts]
    .filter((product) => !normalizedSearch || product.productName.toLowerCase().includes(normalizedSearch) || product.sku.toLowerCase().includes(normalizedSearch) || product.variant.toLowerCase().includes(normalizedSearch))
    .sort((left, right) => left.productName.localeCompare(right.productName, "id", { sensitivity: "base" }));
  const totalCatalogPages = Math.max(1, Math.ceil(filteredCatalogProducts.length / ITEMS_PER_PAGE));
  const currentCatalogPage = Math.min(catalogPage, totalCatalogPages);
  const visibleCatalogProducts = filteredCatalogProducts.slice((currentCatalogPage - 1) * ITEMS_PER_PAGE, currentCatalogPage * ITEMS_PER_PAGE);
  const catalogPageNumbers = useMemo(
    () => buildPaginationNumbers(currentCatalogPage, totalCatalogPages),
    [currentCatalogPage, totalCatalogPages]
  );
  const activePlan =
    procurementPlans.find((plan) => plan.isoDate === activeProcurementDate) ??
    procurementPlans[0];
  const activeProcurementRows = procurementRowsByPlan[activePlan.isoDate] ?? [];
  const totalProcurementItems = procurementPlans.reduce(
    (total, plan) => total + (procurementRowsByPlan[plan.isoDate]?.length ?? 0),
    0
  );

  const handleAddCatalogProduct = (product: CatalogProduct) => {
    const rawQuantity = quantityDrafts[product.id] ?? "1";
    const nextQuantity = Math.max(1, Number.parseInt(rawQuantity || "1", 10) || 1);
    setProcurementRowsByPlan((current) => {
      const currentRows = current[activeProcurementDate] ?? [];
      const existing = currentRows.find((item) => item.sku === product.sku);

      if (existing) {
        return {
          ...current,
          [activeProcurementDate]: currentRows.map((item) =>
            item.sku === product.sku
              ? {
                  ...item,
                  quantity: String(
                    (Number.parseInt(item.quantity, 10) || 0) + nextQuantity
                  ),
                }
              : item
          ),
        };
      }

      return {
        ...current,
        [activeProcurementDate]: [
          ...currentRows,
          {
            id: `proc-${activeProcurementDate}-${product.id}`,
            sku: product.sku,
            productName: product.productName,
            variant: product.variant,
            periodLines: ["16 April 2026 - 30", "April 2026"],
            quantity: String(nextQuantity),
            thumbnailKind: product.thumbnailKind,
            imageUrl: product.imageUrl,
          },
        ],
      };
    });
    setQuantityDrafts((current) => ({ ...current, [product.id]: "1" }));
  };

  const handleDownloadDocument = (type: ProcurementDocumentType) => {
    if (activeProcurementRows.length === 0) return;

    const html = buildProcurementDocumentHtml({
      type,
      procurementDate: activePlan.isoDate,
      procurementDateLabel: activePlan.dateLabel,
      rows: activeProcurementRows,
    });

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${buildProcurementDocumentReference(type, activePlan.isoDate).toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <div>
          <div className="max-w-4xl">
            <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[#16233F]">Pengadaan</h1>
            <p className="mt-2 text-[15px] leading-7 text-[#7C8AA8]">Rencana pengadaan barang otomatis setiap hari berdasarkan data stok dan kebutuhan produk.</p>
            <p className="mt-1 text-[15px] leading-7 text-[#7C8AA8]">Rekomendasi dihitung dari stok terkini, stok dalam perjalanan, serta kebutuhan 15 hari dari menu Produk.</p>
          </div>
          <div className="mt-6 rounded-[24px] border border-[#E3E9FF] bg-white px-4 py-4 shadow-[0_14px_36px_rgba(126,145,190,0.12)] sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[16px] font-bold tracking-[-0.02em] text-[#1A2640]">Rencana Pengadaan (&plusmn;30 Hari)</h2>
                  <span className="inline-flex items-center rounded-full bg-[#EEF3FF] px-3 py-1 text-[12px] font-semibold text-[#62749B]">{totalProcurementItems} item</span>
                </div>
                <p className="mt-3 text-[13px] leading-6 text-[#7E8BA7]">Menampilkan {totalProcurementItems} pengadaan dalam rentang 30 hari ke belakang hingga 30 hari ke depan.</p>
              </div>
              <label className="relative block w-full max-w-[280px]">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9DACCA]"><Search className="h-4 w-4" /></span>
                <input type="text" placeholder="Cari produk atau varian" className="h-11 w-full rounded-xl border border-[#E0E7FF] bg-[#F2F5FF] pl-11 pr-4 text-[14px] text-[#44506A] outline-none placeholder:text-[#9BA8C2]" />
              </label>
            </div>
            <div className="mt-5 overflow-hidden rounded-[18px] border border-[#E7ECFF] bg-white">
              <div className="space-y-3 bg-white px-3 py-3">
                {procurementPlans.map((plan, index) => (
                  <div key={plan.isoDate}>
                    <ProcurementRow
                      plan={plan}
                      expanded={expandedPlanIsoDate === plan.isoDate}
                      rows={procurementRowsByPlan[plan.isoDate] ?? []}
                      onToggle={() => setExpandedPlanIsoDate((current) => current === plan.isoDate ? "" : plan.isoDate)}
                      onRemove={(id) =>
                        setProcurementRowsByPlan((current) => ({
                          ...current,
                          [plan.isoDate]: (current[plan.isoDate] ?? []).filter(
                            (item) => item.id !== id
                          ),
                        }))
                      }
                      onOpenAddModal={() => { setActiveProcurementDate(plan.isoDate); setIsAddModalOpen(true); }}
                      onOpenDocumentModal={() => {
                        setActiveProcurementDate(plan.isoDate);
                        setActiveDocumentType("purchase-quotation");
                        setIsDocumentModalOpen(true);
                      }}
                    />
                    {index < procurementPlans.length - 1 ? <div className="mx-1 mt-3 border-b border-[#EEF2FF]" /> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProcurementAddModal
        open={isAddModalOpen}
        procurementDate={activeProcurementDate}
        search={catalogSearch}
        products={visibleCatalogProducts}
        loading={catalogLoading}
        error={catalogError}
        page={currentCatalogPage}
        totalPages={totalCatalogPages}
        pageNumbers={catalogPageNumbers}
        quantities={quantityDrafts}
        onSearchChange={(value) => { setCatalogSearch(value); setCatalogPage(1); }}
        onQuantityChange={(productId, value) => setQuantityDrafts((current) => ({ ...current, [productId]: value.replace(/[^\d]/g, "") }))}
        onAdd={handleAddCatalogProduct}
        onClose={() => setIsAddModalOpen(false)}
        onPageChange={setCatalogPage}
      />

      <ProcurementDocumentsModal
        open={isDocumentModalOpen}
        procurementDate={activePlan.isoDate}
        procurementDateLabel={activePlan.dateLabel}
        rows={activeProcurementRows}
        activeType={activeDocumentType}
        onSelectType={setActiveDocumentType}
        onDownload={handleDownloadDocument}
        onClose={() => setIsDocumentModalOpen(false)}
      />
    </div>
  );
}
