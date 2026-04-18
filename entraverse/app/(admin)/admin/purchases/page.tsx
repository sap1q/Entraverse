"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api, { isAxiosError } from "@/lib/axios";

type PurchaseTab = "request" | "offer" | "order" | "shipping" | "invoice";

type PurchaseRow = {
  id: string;
  date: string;
  number: string;
  supplier: string;
  status: string;
  tab: PurchaseTab;
  estimate?: string;
  value?: string;
  outstandingBill?: string;
  quantity?: string;
  dueDate?: string;
  total?: string;
};

type TableColumn = {
  key: string;
  label: string;
  className: string;
  headerClassName?: string;
  render: (row: PurchaseRow) => React.ReactNode;
};

type ActionMenuState = {
  id: string;
  top: number;
  left: number;
};

type PurchaseApiRecord = Record<string, unknown>;

const PURCHASES_PER_PAGE = 6;

const purchaseTabs: Array<{ key: PurchaseTab; label: string }> = [
  { key: "request", label: "Permintaan" },
  { key: "offer", label: "Penawaran" },
  { key: "order", label: "Pesanan" },
  { key: "shipping", label: "Pengiriman" },
  { key: "invoice", label: "Faktur" },
];

const emptyPurchaseRowsByTab: Record<PurchaseTab, PurchaseRow[]> = {
  request: [],
  offer: [],
  order: [],
  shipping: [],
  invoice: [],
};

const emptyBooleanTabState: Record<PurchaseTab, boolean> = {
  request: false,
  offer: false,
  order: false,
  shipping: false,
  invoice: false,
};

const emptyErrorTabState: Record<PurchaseTab, string | null> = {
  request: null,
  offer: null,
  order: null,
  shipping: null,
  invoice: null,
};

const loadingLabelByTab: Record<PurchaseTab, string> = {
  request: "Memuat Permintaan Pembelian dari Mekari Jurnal...",
  offer: "Memuat Penawaran Pembelian dari Mekari Jurnal...",
  order: "Memuat Pesanan Pembelian dari Mekari Jurnal...",
  shipping: "Memuat Pengiriman Pembelian dari Mekari Jurnal...",
  invoice: "Memuat Faktur Pembelian dari Mekari Jurnal...",
};

const emptyLabelByTab: Record<PurchaseTab, string> = {
  request: "Belum ada permintaan pembelian dari Mekari Jurnal.",
  offer: "Belum ada penawaran pembelian dari Mekari Jurnal.",
  order: "Belum ada pesanan pembelian dari Mekari Jurnal.",
  shipping: "Belum ada pengiriman pembelian dari Mekari Jurnal.",
  invoice: "Belum ada faktur pembelian dari Mekari Jurnal.",
};

const endpointPathCandidatesByTab: Record<PurchaseTab, string[]> = {
  request: [
    "integrations/jurnal/purchase-requests",
    "admin/purchases/requests",
    "admin/purchases",
  ],
  offer: [
    "integrations/jurnal/purchase-quotations",
    "admin/purchases/quotations",
    "admin/purchases",
  ],
  order: [
    "integrations/jurnal/purchase-orders",
    "admin/purchases/orders",
    "admin/purchases",
  ],
  shipping: [
    "integrations/jurnal/purchase-deliveries",
    "admin/purchases/shipments",
    "admin/purchases",
  ],
  invoice: [
    "integrations/jurnal/purchase-invoices",
    "admin/purchases/invoices",
    "admin/purchases",
  ],
};

const payloadKeysByTab: Record<PurchaseTab, string[]> = {
  request: ["purchase_requests", "purchaseRequests", "requests", "items", "rows", "data"],
  offer: ["purchase_quotations", "purchaseQuotations", "quotations", "items", "rows", "data"],
  order: ["purchase_orders", "purchaseOrders", "orders", "items", "rows", "data"],
  shipping: ["purchase_deliveries", "purchaseDeliveries", "shipments", "deliveries", "items", "rows", "data"],
  invoice: ["purchase_invoices", "purchaseInvoices", "invoices", "bills", "items", "rows", "data"],
};

const documentTypeByTab: Record<PurchaseTab, string> = {
  request: "purchase_request",
  offer: "purchase_quotation",
  order: "purchase_order",
  shipping: "purchase_delivery",
  invoice: "purchase_invoice",
};

const toStringValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const toNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/[^\d,.-]/g, "");
  if (!normalized || !/\d/.test(normalized)) return null;

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  let parsedCandidate = normalized;

  if (decimalIndex >= 0) {
    const integerPart = normalized.slice(0, decimalIndex).replace(/[.,]/g, "");
    const decimalPart = normalized.slice(decimalIndex + 1).replace(/[^\d]/g, "");
    parsedCandidate = `${integerPart}.${decimalPart}`;
  } else {
    parsedCandidate = normalized.replace(/[^\d-]/g, "");
  }

  const parsed = Number(parsedCandidate);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRecord = (value: unknown): PurchaseApiRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as PurchaseApiRecord) : null;

const pickValue = (source: PurchaseApiRecord, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in source && source[key] !== null && source[key] !== undefined) {
      return source[key];
    }
  }

  return null;
};

const pickString = (source: PurchaseApiRecord, keys: string[]): string =>
  toStringValue(pickValue(source, keys));

const humanizeText = (value: string): string => {
  const cleaned = value.replace(/[_-]+/g, " ").trim();
  if (!cleaned) return "-";

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateLabel = (value: unknown): string => {
  const raw = toStringValue(value);
  if (!raw) return "-";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("id-ID").format(date);
};

const normalizeCurrencyCode = (value: unknown): string => {
  const raw = toStringValue(value).toUpperCase();
  return raw.length === 3 ? raw : "IDR";
};

const formatMoneyLabel = (amount: unknown, currencyValue?: unknown): string => {
  const raw = toStringValue(amount);
  const parsed = toNumberValue(amount);

  if (parsed === null) return raw || "-";

  const currency = normalizeCurrencyCode(currencyValue);
  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  });

  return formatter.format(parsed);
};

const formatQuantityLabel = (value: unknown, fallbackLength?: number): string => {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  const parsed = toNumberValue(value);
  if (parsed !== null) {
    return `${parsed} item`;
  }

  if (typeof fallbackLength === "number" && fallbackLength > 0) {
    return `${fallbackLength} item`;
  }

  return "-";
};

const formatStatusLabel = (value: unknown): string => {
  const normalized = toStringValue(value).toLowerCase();
  if (!normalized) return "-";

  const statusMap: Record<string, string> = {
    active: "Aktif",
    approved: "Disetujui",
    closed: "Selesai",
    completed: "Selesai",
    delivered: "Dikirim",
    done: "Selesai",
    draft: "Draft",
    open: "Open",
    paid: "Lunas",
    partial: "Parsial",
    pending: "Menunggu",
    process: "Diproses",
    processing: "Diproses",
    received: "Diterima",
    sent: "Dikirim",
    unpaid: "Belum Dibayar",
  };

  return statusMap[normalized] ?? humanizeText(normalized);
};

const resolveApiPath = (path: string): string => {
  const normalizedPath = path.replace(/^\/+/, "");
  const base = String(api.defaults.baseURL ?? "").toLowerCase();

  if (base.endsWith("/v1") || base.includes("/api/v1")) {
    return `/${normalizedPath}`;
  }

  return `/v1/${normalizedPath}`;
};

const extractRecords = (value: unknown): PurchaseApiRecord[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toRecord(item))
    .filter((item): item is PurchaseApiRecord => item !== null);
};

const extractPurchaseApiRows = (payload: unknown, tab: PurchaseTab): PurchaseApiRecord[] => {
  const directRecords = extractRecords(payload);
  if (directRecords.length > 0) return directRecords;

  const keys = payloadKeysByTab[tab];
  const queue: unknown[] = [payload];
  const payloadRecord = toRecord(payload);

  if (payloadRecord) {
    queue.push(payloadRecord.data, payloadRecord.result, payloadRecord.payload);
  }

  for (const source of queue) {
    const record = toRecord(source);
    if (!record) continue;

    for (const key of keys) {
      const nextRecords = extractRecords(record[key]);
      if (nextRecords.length > 0) return nextRecords;
    }
  }

  return [];
};

const mapPurchaseApiRow = (row: PurchaseApiRecord, tab: PurchaseTab, index: number): PurchaseRow => {
  const number =
    pickString(row, [
      "number",
      "transaction_no",
      "purchase_number",
      "purchase_no",
      "document_number",
      "reference_no",
      "reference",
      "code",
      "no",
    ]) || `Dokumen ${index + 1}`;
  const supplier =
    pickString(row, ["supplier_name", "supplier", "vendor_name", "vendor", "contact_name", "display_name"]) || "-";
  const currency =
    pickString(row, ["currency_code", "currency", "currency_symbol"]) || "IDR";
  const lineItems = Array.isArray(row.items) ? row.items : Array.isArray(row.line_items) ? row.line_items : [];

  return {
    id:
      pickString(row, ["id", "purchase_id", "transaction_id", "uuid", "number", "transaction_no"]) ||
      `${tab}-${number}-${index}`,
    date: formatDateLabel(pickValue(row, ["date", "transaction_date", "created_at", "purchase_date"])),
    number,
    supplier,
    status: formatStatusLabel(pickValue(row, ["status", "state", "approval_status", "payment_status"])),
    tab,
    estimate: formatDateLabel(pickValue(row, ["estimate", "estimated_date", "expected_date", "due_date"])),
    value: formatMoneyLabel(
      pickValue(row, ["value", "amount", "subtotal", "total_amount", "grand_total"]),
      currency
    ),
    outstandingBill: formatMoneyLabel(
      pickValue(row, ["outstanding_bill", "outstanding_balance", "remaining_amount", "balance_due"]),
      currency
    ),
    quantity: formatQuantityLabel(
      pickValue(row, ["quantity", "item_count", "total_quantity"]),
      lineItems.length
    ),
    dueDate: formatDateLabel(pickValue(row, ["due_date", "payment_due_date", "estimated_date"])),
    total: formatMoneyLabel(
      pickValue(row, ["total", "total_amount", "grand_total", "amount_due"]),
      currency
    ),
  };
};

const buildPurchaseFetchErrorMessage = (tab: PurchaseTab, error: unknown): string => {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;

    if (status === 401 || status === 419) {
      return "Sesi admin sudah berakhir. Silakan login ulang lalu muat ulang halaman pembelian.";
    }

    if (status === 403) {
      return `Anda tidak memiliki akses untuk membaca ${purchaseTabs.find((item) => item.key === tab)?.label.toLowerCase()} dari Mekari Jurnal.`;
    }

    if (status >= 500) {
      return "Server sedang bermasalah saat mengambil data pembelian dari Mekari Jurnal.";
    }

    if (typeof error.response?.data?.message === "string" && error.response.data.message.trim() !== "") {
      return error.response.data.message;
    }
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return `Gagal memuat ${purchaseTabs.find((item) => item.key === tab)?.label.toLowerCase()} dari Mekari Jurnal.`;
};

const fetchPurchasesByTab = async (tab: PurchaseTab, signal: AbortSignal): Promise<PurchaseRow[]> => {
  const candidatePaths = endpointPathCandidatesByTab[tab];
  const params = {
    source: "jurnal",
    tab,
    document_type: documentTypeByTab[tab],
  };
  let lastError: unknown = null;

  for (const candidatePath of candidatePaths) {
    try {
      const response = await api.get(resolveApiPath(candidatePath), {
        params,
        signal,
      });

      const rows = extractPurchaseApiRows(response.data, tab).map((row, index) =>
        mapPurchaseApiRow(row, tab, index)
      );

      return rows;
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }

      if (isAxiosError(error)) {
        const status = error.response?.status ?? 0;
        if (status === 404 || status === 405 || status === 422) {
          lastError = error;
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError ?? new Error(`Endpoint Mekari Jurnal untuk tab ${tab} belum tersedia.`);
};

const buildPaginationNumbers = (currentPage: number, totalPages: number): number[] => {
  if (totalPages <= 1) return [1];

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from(
    { length: end - adjustedStart + 1 },
    (_, index) => adjustedStart + index
  );
};

const viewButtonClassName =
  "inline-flex h-[30px] items-center justify-center rounded-[9px] border border-[#D7E1F6] bg-[#EEF3FF] px-3 text-[12px] font-semibold text-[#20304E]";

const orderActionItems = ["Lihat", "Test Kurs", "Tandai Barang Diterima"];

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<PurchaseTab>("request");
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionMenu, setOpenActionMenu] = useState<ActionMenuState | null>(null);
  const [purchaseRowsByTab, setPurchaseRowsByTab] =
    useState<Record<PurchaseTab, PurchaseRow[]>>(emptyPurchaseRowsByTab);
  const [loadingTabs, setLoadingTabs] =
    useState<Record<PurchaseTab, boolean>>(emptyBooleanTabState);
  const [loadedTabs, setLoadedTabs] =
    useState<Record<PurchaseTab, boolean>>(emptyBooleanTabState);
  const [errorTabs, setErrorTabs] =
    useState<Record<PurchaseTab, string | null>>(emptyErrorTabState);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openActionMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) return;
      if (actionMenuRef.current?.contains(target)) return;
      if (target.closest("[data-action-menu-trigger='true']")) return;

      setOpenActionMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionMenu(null);
      }
    };

    const handleViewportChange = () => {
      setOpenActionMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [openActionMenu]);

  useEffect(() => {
    if (loadedTabs[activeTab] || loadingTabs[activeTab] || errorTabs[activeTab]) {
      return;
    }

    const controller = new AbortController();
    let stillMounted = true;

    const loadRows = async () => {
      setLoadingTabs((prev) => ({ ...prev, [activeTab]: true }));
      setErrorTabs((prev) => ({ ...prev, [activeTab]: null }));

      try {
        const rows = await fetchPurchasesByTab(activeTab, controller.signal);

        if (!stillMounted) return;

        setPurchaseRowsByTab((prev) => ({
          ...prev,
          [activeTab]: rows,
        }));
        setLoadedTabs((prev) => ({ ...prev, [activeTab]: true }));
      } catch (error) {
        if (controller.signal.aborted || !stillMounted) return;

        setPurchaseRowsByTab((prev) => ({
          ...prev,
          [activeTab]: [],
        }));
        setErrorTabs((prev) => ({
          ...prev,
          [activeTab]: buildPurchaseFetchErrorMessage(activeTab, error),
        }));
      } finally {
        if (stillMounted) {
          setLoadingTabs((prev) => ({ ...prev, [activeTab]: false }));
        }
      }
    };

    void loadRows();

    return () => {
      stillMounted = false;
      controller.abort();
    };
  }, [activeTab, errorTabs, loadedTabs, loadingTabs]);

  const columnsByTab = useMemo<Record<PurchaseTab, TableColumn[]>>(
    () => ({
      request: [
        {
          key: "date",
          label: "Tanggal",
          className: "leading-6 text-[#4B5D81]",
          render: (row) => row.date,
        },
        {
          key: "number",
          label: "Nomor",
          className: "whitespace-pre-line font-semibold leading-5 text-[#1E2A45]",
          render: (row) => row.number,
        },
        {
          key: "supplier",
          label: "Pemasok",
          className: "leading-5 text-[#43506E]",
          render: (row) => row.supplier,
        },
        {
          key: "status",
          label: "Status",
          className: "leading-6 text-[#43506E]",
          render: (row) => row.status,
        },
        {
          key: "estimate",
          label: "Estimasi",
          className: "text-right leading-6 text-[#43506E]",
          headerClassName: "text-right",
          render: (row) => row.estimate ?? "-",
        },
        {
          key: "action",
          label: "Aksi",
          className: "flex justify-center",
          headerClassName: "text-center",
          render: () => <button type="button" className={viewButtonClassName}>Lihat</button>,
        },
      ],
      offer: [
        {
          key: "date",
          label: "Tanggal",
          className: "leading-6 text-[#4B5D81]",
          render: (row) => row.date,
        },
        {
          key: "number",
          label: "Nomor",
          className: "font-semibold leading-5 text-[#1E2A45]",
          render: (row) => row.number,
        },
        {
          key: "supplier",
          label: "Pemasok",
          className: "leading-5 text-[#43506E]",
          render: (row) => row.supplier,
        },
        {
          key: "status",
          label: "Status",
          className: "leading-6 text-[#43506E]",
          render: (row) => row.status,
        },
        {
          key: "value",
          label: "Nilai",
          className: "text-right leading-6 text-[#43506E]",
          headerClassName: "text-right",
          render: (row) => row.value ?? "-",
        },
        {
          key: "action",
          label: "Aksi",
          className: "flex justify-center",
          headerClassName: "text-center",
          render: () => <button type="button" className={viewButtonClassName}>Lihat</button>,
        },
      ],
      order: [
        {
          key: "date",
          label: "Tanggal",
          className: "leading-6 text-[#4B5D81]",
          render: (row) => row.date,
        },
        {
          key: "number",
          label: "Nomor",
          className: "font-semibold leading-5 text-[#1E2A45]",
          render: (row) => row.number,
        },
        {
          key: "supplier",
          label: "Pemasok",
          className: "leading-5 text-[#43506E]",
          render: (row) => row.supplier,
        },
        {
          key: "outstandingBill",
          label: "Sisa tagihan",
          className: "leading-6 text-[#43506E]",
          render: (row) => row.outstandingBill ?? "-",
        },
        {
          key: "status",
          label: "Status",
          className: "leading-6 text-[#43506E]",
          render: (row) => row.status,
        },
        {
          key: "action",
          label: "Aksi",
          className: "flex justify-center",
          headerClassName: "text-center",
          render: (row) => (
            <div className="relative flex justify-center">
              <button
                type="button"
                onClick={(event) => {
                  const button = event.currentTarget;
                  const { bottom, right } = button.getBoundingClientRect();

                  setOpenActionMenu((current) =>
                    current?.id === row.id
                      ? null
                      : {
                          id: row.id,
                          top: bottom + 6,
                          left: right,
                        }
                  );
                }}
                data-action-menu-trigger="true"
                className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[10px] border border-[#D7E1F6] bg-[#EEF3FF] text-[#20304E]"
                aria-label={`Aksi ${row.number}`}
                aria-expanded={openActionMenu?.id === row.id}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          ),
        },
      ],
      shipping: [
        {
          key: "date",
          label: "Tanggal",
          className: "leading-6 text-[#4B5D81]",
          render: (row) => row.date,
        },
        {
          key: "number",
          label: "Nomor",
          className: "font-semibold leading-5 text-[#1E2A45]",
          render: (row) => row.number,
        },
        {
          key: "supplier",
          label: "Pemasok",
          className: "leading-5 text-[#43506E]",
          render: (row) => row.supplier,
        },
        {
          key: "status",
          label: "Status",
          className: "leading-6 text-[#43506E]",
          render: (row) => row.status,
        },
        {
          key: "quantity",
          label: "Kuantitas",
          className: "text-right leading-6 text-[#43506E]",
          headerClassName: "text-right",
          render: (row) => row.quantity ?? "-",
        },
        {
          key: "action",
          label: "Aksi",
          className: "flex justify-center",
          headerClassName: "text-center",
          render: () => <button type="button" className={viewButtonClassName}>Lihat</button>,
        },
      ],
      invoice: [
        {
          key: "date",
          label: "Tanggal",
          className: "leading-6 text-[#4B5D81]",
          render: (row) => row.date,
        },
        {
          key: "number",
          label: "Nomor",
          className: "font-semibold leading-5 text-[#1E2A45]",
          render: (row) => row.number,
        },
        {
          key: "supplier",
          label: "Pemasok",
          className: "leading-5 text-[#43506E]",
          render: (row) => row.supplier,
        },
        {
          key: "dueDate",
          label: "Jatuh tempo",
          className: "leading-6 text-[#43506E]",
          render: (row) => row.dueDate ?? "-",
        },
        {
          key: "status",
          label: "Status",
          className: "leading-6 text-[#43506E]",
          render: (row) => row.status,
        },
        {
          key: "total",
          label: "Total",
          className: "text-right leading-6 text-[#43506E]",
          headerClassName: "text-right",
          render: (row) => row.total ?? "-",
        },
        {
          key: "outstandingBill",
          label: "Sisa tagihan",
          className: "text-right leading-6 text-[#43506E]",
          headerClassName: "text-right",
          render: (row) => row.outstandingBill ?? "-",
        },
        {
          key: "action",
          label: "Aksi",
          className: "flex justify-center",
          headerClassName: "text-center",
          render: () => <button type="button" className={viewButtonClassName}>Lihat</button>,
        },
      ],
    }),
    [openActionMenu]
  );

  const filteredRows = purchaseRowsByTab[activeTab];
  const isActiveTabLoading = loadingTabs[activeTab];
  const activeTabError = errorTabs[activeTab];
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PURCHASES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleRows = filteredRows.slice(
    (safePage - 1) * PURCHASES_PER_PAGE,
    safePage * PURCHASES_PER_PAGE
  );
  const pageNumbers = buildPaginationNumbers(safePage, totalPages);
  const activeColumns = columnsByTab[activeTab];
  const gridTemplateColumnsByTab: Record<PurchaseTab, string> = {
    request: "120px 1.15fr 1.25fr 1fr 100px 84px",
    offer: "120px 1.15fr 1.25fr 1fr 150px 84px",
    order: "120px 1.1fr 1.15fr 150px 1fr 84px",
    shipping: "120px 1.15fr 1.25fr 1fr 110px 84px",
    invoice: "120px 1fr 1.15fr 120px 1fr 140px 140px 84px",
  };
  const activeGridColumns = gridTemplateColumnsByTab[activeTab];
  const activeLoadingLabel = loadingLabelByTab[activeTab];
  const activeEmptyLabel = emptyLabelByTab[activeTab];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[#16233F]">
              Pembelian
            </h1>
            <p className="mt-2 text-[14px] leading-7 text-[#7C8AA8]">
              Kelola permintaan pembelian hingga penerimaan faktur untuk suplai marketplace.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-[42px] items-center justify-center rounded-[10px] bg-[#3F66F0] px-5 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(63,102,240,0.2)] transition hover:bg-[#355AE0]"
          >
            Buat pembelian baru
          </button>
        </div>

        <div className="mt-6 rounded-[22px] border border-[#E3E9FF] bg-white p-4 shadow-[0_14px_36px_rgba(126,145,190,0.08)] sm:p-5">
          <div className="thin-scrollbar overflow-x-auto border-b border-[#D9E4FF] pb-[10px]">
            <div className="inline-flex min-w-max items-center gap-2 bg-white">
              {purchaseTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setCurrentPage(1);
                    setOpenActionMenu(null);
                  }}
                  className={`inline-flex h-[46px] items-center justify-center rounded-[14px] px-5 text-[15px] font-semibold transition ${
                    activeTab === tab.key
                      ? "border border-[#BFD0FF] bg-[#EEF3FF] text-[#274AA8]"
                      : "text-[#5E6F97] hover:bg-[#F6F8FF]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-[10px] overflow-hidden rounded-[14px] border border-[#E7ECFF]">
            <div className="thin-scrollbar overflow-x-auto">
              <div
                className={activeTab === "invoice" ? "min-w-[1060px]" : "min-w-[860px]"}
              >
                <div
                  className="grid items-center gap-4 bg-[#EDF1FF] px-4 py-4 text-[14px] font-semibold text-[#526991]"
                  style={{ gridTemplateColumns: activeGridColumns }}
                >
                  {activeColumns.map((column) => (
                    <p
                      key={column.key}
                      className={column.headerClassName}
                    >
                      {column.label}
                    </p>
                  ))}
                </div>

                <div className="bg-white">
                  {isActiveTabLoading ? (
                    <div className="px-4 py-10 text-center text-[14px] font-medium text-[#617091]">
                      {activeLoadingLabel}
                    </div>
                  ) : activeTabError ? (
                    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                      <p className="max-w-xl text-[14px] leading-6 text-[#A33B55]">
                        {activeTabError}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage(1);
                          setOpenActionMenu(null);
                          setErrorTabs((prev) => ({ ...prev, [activeTab]: null }));
                          setLoadedTabs((prev) => ({ ...prev, [activeTab]: false }));
                        }}
                        className="inline-flex h-[34px] items-center justify-center rounded-[10px] border border-[#D7E1F6] bg-[#EEF3FF] px-4 text-[12px] font-semibold text-[#20304E]"
                      >
                        Coba lagi
                      </button>
                    </div>
                  ) : visibleRows.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[14px] text-[#617091]">
                      {activeEmptyLabel}
                    </div>
                  ) : (
                    visibleRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid items-center gap-4 border-t border-[#DCE5FF] px-4 py-4 text-[14px] text-[#24324F] first:border-t-0"
                        style={{ gridTemplateColumns: activeGridColumns }}
                      >
                        {activeColumns.map((column) => (
                          <div key={`${row.id}-${column.key}`} className={column.className}>
                            {column.render(row)}
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-[16px] border border-[#E6ECFF] bg-[#FBFCFF] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[13px] text-[#617091]">
              {isActiveTabLoading
                ? activeLoadingLabel
                : `Menampilkan ${visibleRows.length} data, halaman ${safePage} dari ${totalPages}`}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(Math.max(1, safePage - 1));
                  setOpenActionMenu(null);
                }}
                disabled={safePage === 1 || isActiveTabLoading || filteredRows.length === 0}
                className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border border-[#D6DFF6] bg-white text-[#202B43] disabled:cursor-not-allowed disabled:text-[#A1ABC1]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => {
                      setCurrentPage(pageNumber);
                      setOpenActionMenu(null);
                    }}
                    disabled={isActiveTabLoading || filteredRows.length === 0}
                    className={`inline-flex h-[38px] min-w-[38px] items-center justify-center rounded-[11px] border px-3 text-[13px] font-semibold transition ${
                      pageNumber === safePage
                        ? "border-[#4F79FF] bg-[#E8EEFF] text-[#3152D9]"
                        : "border-[#D6DFF6] bg-white text-[#617091]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <p className="min-w-[98px] text-center text-[13px] font-medium text-[#617091]">
                Halaman {safePage} / {totalPages}
              </p>

              <button
                type="button"
                onClick={() => {
                  setCurrentPage(Math.min(totalPages, safePage + 1));
                  setOpenActionMenu(null);
                }}
                disabled={safePage === totalPages || isActiveTabLoading || filteredRows.length === 0}
                className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border border-[#D6DFF6] bg-white text-[#202B43] disabled:cursor-not-allowed disabled:text-[#A1ABC1]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
      {openActionMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={actionMenuRef}
              className="fixed z-[120] min-w-[180px] overflow-hidden rounded-[14px] border border-[#DDE6FF] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
              style={{
                top: openActionMenu.top,
                left: openActionMenu.left,
                transform: "translateX(-100%)",
              }}
            >
              {orderActionItems.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`flex w-full items-center px-4 py-3 text-left text-[13px] font-medium text-[#24324F] transition hover:bg-[#F5F8FF] ${
                    index < orderActionItems.length - 1 ? "border-b border-[#EEF2FF]" : ""
                  }`}
                  onClick={() => setOpenActionMenu(null)}
                >
                  {item}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
