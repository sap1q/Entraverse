"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarRange,
  ChevronDown,
  CircleDollarSign,
  RefreshCcw,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import api, { isAxiosError } from "@/lib/axios";

type JsonRecord = Record<string, unknown>;

type MovementRow = {
  key: string;
  warehouse: string;
  product: string;
  unit: string;
  openingBalance: number;
  qtyIn: number;
  qtyOut: number;
  endingBalance: number;
};

type ReportSourceMode = "auto" | "manual";

type ReportPeriodKey = "periodA" | "periodB" | "custom";

type ReportDateFilter = {
  startDate: string;
  endDate: string;
};

type ReportPeriodPresetKey =
  | "all"
  | "today"
  | "yesterday"
  | "last7Days"
  | "last30Days"
  | "thisMonth"
  | "lastMonth"
  | "periodA"
  | "periodB"
  | "custom";

type UnmatchedInvoice = {
  invoiceId: string;
  transactionNo: string;
  transactionDate: string;
};

type AutoStockState = {
  loading: boolean;
  error: string | null;
  warning: string | null;
  usingFallbackData: boolean;
  rows: MovementRow[];
  pagination: {
    page: number;
    pageSize: number;
  };
  lastRequestKey: string | null;
  lastLoadedAt: string | null;
  startDate: string;
  endDate: string;
  unmatchedInvoiceCount: number;
  unmatchedInvoices: UnmatchedInvoice[];
};

type FinanceSummaryState = {
  loading: boolean;
  error: string | null;
  lastRequestKey: string | null;
  lastLoadedAt: string | null;
  lastSyncAt: string | null;
  orderCount: number;
  syncedOrderCount: number;
  metrics: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpense: number;
    netIncome: number;
  };
};

type ManualStockPeriodState = {
  loading: boolean;
  error: string | null;
  rows: MovementRow[];
  fileName: string | null;
  lastLoadedAt: string | null;
};

type ManualStockState = {
  periodA: ManualStockPeriodState;
  periodB: ManualStockPeriodState;
};

type ReportUiState = {
  sourceMode: ReportSourceMode;
  activePeriod: ReportPeriodKey;
  periodPresetDraft: ReportPeriodPresetKey;
  periodPresetApplied: ReportPeriodPresetKey;
  search: string;
  dateFilter: {
    draft: ReportDateFilter;
    applied: ReportDateFilter;
  };
};

type PaginationItem = number | "...";

const MOVEMENT_PAGE_SIZE = 10;
const CLIENT_REPORT_CACHE_TTL_MS = 120000;
const DEFAULT_MANUAL_PERIOD_STATE: ManualStockPeriodState = {
  loading: false,
  error: null,
  rows: [],
  fileName: null,
  lastLoadedAt: null,
};
const SUMMARY_QUICK_RANGES: Array<{ key: ReportPeriodPresetKey; label: string }> = [
  { key: "all", label: "Semua periode" },
  { key: "today", label: "Hari ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "last7Days", label: "7 hari terakhir" },
  { key: "last30Days", label: "30 hari terakhir" },
  { key: "thisMonth", label: "Bulan ini" },
  { key: "lastMonth", label: "Bulan lalu" },
];
const SUMMARY_QUICK_RANGE_LAYOUT: ReportPeriodPresetKey[][] = [
  ["all", "today"],
  ["yesterday", "last7Days"],
  ["last30Days", "thisMonth"],
  ["lastMonth"],
];

type AutoStockCacheEntry = {
  cachedAt: number;
  warning: string | null;
  usingFallbackData: boolean;
  rows: MovementRow[];
  lastLoadedAt: string | null;
  startDate: string;
  endDate: string;
  unmatchedInvoiceCount: number;
  unmatchedInvoices: UnmatchedInvoice[];
};

type FinanceSummaryCacheEntry = {
  cachedAt: number;
  lastLoadedAt: string | null;
  lastSyncAt: string | null;
  orderCount: number;
  syncedOrderCount: number;
  metrics: FinanceSummaryState["metrics"];
};

const SUMMARY_CARD_DEFINITIONS = [
  {
    key: "revenue",
    label: "Pendapatan",
    icon: CircleDollarSign,
    tone: "border-blue-100 bg-blue-50/80 text-blue-700",
  },
  {
    key: "cogs",
    label: "HPP",
    icon: TrendingDown,
    tone: "border-rose-100 bg-rose-50/80 text-rose-700",
  },
  {
    key: "grossProfit",
    label: "Laba Kotor",
    icon: TrendingUp,
    tone: "border-emerald-100 bg-emerald-50/80 text-emerald-700",
  },
  {
    key: "operatingExpense",
    label: "Beban Operasional",
    icon: ReceiptText,
    tone: "border-amber-100 bg-amber-50/80 text-amber-700",
  },
  {
    key: "netIncome",
    label: "Laba Bersih",
    icon: Wallet,
    tone: "border-violet-100 bg-violet-50/80 text-violet-700",
  },
] as const;

const toNumberValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toStringValue = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const formatQuantity = (value: number): string =>
  new Intl.NumberFormat("id-ID").format(Math.max(0, value));

const formatCompactCurrency = (value: number): string => {
  const absoluteValue = Math.abs(value);
  const formatter = new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: absoluteValue >= 1_000_000_000 ? 1 : 2,
  });
  const prefix = value < 0 ? "(Rp " : "Rp ";
  const suffix = value < 0 ? ")" : "";

  return `${prefix}${formatter.format(absoluteValue)}${suffix}`;
};

const formatPeriodDate = (value: Date): string =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

const formatInvoiceDate = (value: string): string => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return formatPeriodDate(date);
};

const formatDateTimeLabel = (value: string): string => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getMovementPeriodRange = (period: ReportPeriodKey, baseDate = new Date()) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  if (period === "periodA") {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month, 15);

    return { startDate, endDate, label: "Periode A" };
  }

  if (period === "custom") {
    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month + 1, 0),
      label: "Rentang Kustom",
    };
  }

  const startDate = new Date(year, month, 16);
  const endDate = new Date(year, month + 1, 0);

  return { startDate, endDate, label: "Periode B" };
};

const toIsoDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatFilterDate = (value: string): string => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return formatPeriodDate(date);
};

const resolvePresetDateFilter = (
  preset: ReportPeriodPresetKey,
  baseDate = new Date()
): { filter: ReportDateFilter; activePeriod: ReportPeriodKey } => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const today = new Date(year, month, baseDate.getDate());

  switch (preset) {
    case "all":
      return {
        filter: { startDate: "", endDate: "" },
        activePeriod: "custom",
      };
    case "today":
      return {
        filter: { startDate: toIsoDate(today), endDate: toIsoDate(today) },
        activePeriod: "custom",
      };
    case "yesterday": {
      const yesterday = new Date(year, month, baseDate.getDate() - 1);
      return {
        filter: { startDate: toIsoDate(yesterday), endDate: toIsoDate(yesterday) },
        activePeriod: "custom",
      };
    }
    case "last7Days": {
      const startDate = new Date(year, month, baseDate.getDate() - 6);
      return {
        filter: { startDate: toIsoDate(startDate), endDate: toIsoDate(today) },
        activePeriod: "custom",
      };
    }
    case "last30Days": {
      const startDate = new Date(year, month, baseDate.getDate() - 29);
      return {
        filter: { startDate: toIsoDate(startDate), endDate: toIsoDate(today) },
        activePeriod: "custom",
      };
    }
    case "thisMonth": {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      return {
        filter: { startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) },
        activePeriod: "custom",
      };
    }
    case "lastMonth": {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      return {
        filter: { startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) },
        activePeriod: "custom",
      };
    }
    case "periodA": {
      const period = getMovementPeriodRange("periodA", baseDate);
      return {
        filter: { startDate: toIsoDate(period.startDate), endDate: toIsoDate(period.endDate) },
        activePeriod: "periodA",
      };
    }
    case "periodB": {
      const period = getMovementPeriodRange("periodB", baseDate);
      return {
        filter: { startDate: toIsoDate(period.startDate), endDate: toIsoDate(period.endDate) },
        activePeriod: "periodB",
      };
    }
    default:
      return {
        filter: { startDate: "", endDate: "" },
        activePeriod: "custom",
      };
  }
};

const getPeriodPresetLabel = (
  preset: ReportPeriodPresetKey,
  filter: ReportDateFilter
): string => {
  const staticLabels: Record<Exclude<ReportPeriodPresetKey, "custom">, string> = {
    all: "Semua periode",
    today: "Hari ini",
    yesterday: "Kemarin",
    last7Days: "7 hari terakhir",
    last30Days: "30 hari terakhir",
    thisMonth: "Bulan ini",
    lastMonth: "Bulan lalu",
    periodA: "Periode A",
    periodB: "Periode B",
  };

  if (preset !== "custom") {
    return staticLabels[preset];
  }

  if (filter.startDate && filter.endDate) {
    return `${formatFilterDate(filter.startDate)} - ${formatFilterDate(filter.endDate)}`;
  }

  return "Pilih periode";
};

export default function ReportsPage() {
  const initialPeriod = getMovementPeriodRange("periodA");
  const initialDateFilter = {
    startDate: toIsoDate(initialPeriod.startDate),
    endDate: toIsoDate(initialPeriod.endDate),
  };

  const [reportUiState, setReportUiState] = useState<ReportUiState>({
    sourceMode: "auto",
    activePeriod: "periodA",
    periodPresetDraft: "periodA",
    periodPresetApplied: "periodA",
    search: "",
    dateFilter: {
      draft: initialDateFilter,
      applied: initialDateFilter,
    },
  });
  const [financeState, setFinanceState] = useState<FinanceSummaryState>({
    loading: true,
    error: null,
    lastRequestKey: null,
    lastLoadedAt: null,
    lastSyncAt: null,
    orderCount: 0,
    syncedOrderCount: 0,
    metrics: {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpense: 0,
      netIncome: 0,
    },
  });
  const [autoStockState, setAutoStockState] = useState<AutoStockState>({
    loading: true,
    error: null,
    warning: null,
    usingFallbackData: false,
    rows: [],
    pagination: {
      page: 1,
      pageSize: MOVEMENT_PAGE_SIZE,
    },
    lastRequestKey: null,
    lastLoadedAt: null,
    startDate: "",
    endDate: "",
    unmatchedInvoiceCount: 0,
    unmatchedInvoices: [],
  });
  const [manualStockState] = useState<ManualStockState>({
    periodA: DEFAULT_MANUAL_PERIOD_STATE,
    periodB: DEFAULT_MANUAL_PERIOD_STATE,
  });
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isSummaryPeriodPickerOpen, setIsSummaryPeriodPickerOpen] = useState(false);
  const [summaryPeriodError, setSummaryPeriodError] = useState<string | null>(null);
  const financeRequestAbortRef = useRef<AbortController | null>(null);
  const financeRequestInFlightKeyRef = useRef<string | null>(null);
  const financeSummaryCacheRef = useRef<Map<string, FinanceSummaryCacheEntry>>(new Map());
  const autoRequestAbortRef = useRef<AbortController | null>(null);
  const autoRequestInFlightKeyRef = useRef<string | null>(null);
  const autoStockCacheRef = useRef<Map<string, AutoStockCacheEntry>>(new Map());
  const summaryPeriodPickerRef = useRef<HTMLDivElement | null>(null);

  const appliedPeriodTriggerLabel = getPeriodPresetLabel(
    reportUiState.periodPresetApplied,
    reportUiState.dateFilter.applied
  );
  const appliedPeriodHeadingLabel =
    reportUiState.dateFilter.applied.startDate && reportUiState.dateFilter.applied.endDate
      ? `${formatFilterDate(reportUiState.dateFilter.applied.startDate)} - ${formatFilterDate(reportUiState.dateFilter.applied.endDate)}`
      : appliedPeriodTriggerLabel;
  const movementPeriodContextLabel =
    reportUiState.periodPresetApplied === "periodA"
      ? "Periode A"
      : reportUiState.periodPresetApplied === "periodB"
        ? "Periode B"
        : appliedPeriodTriggerLabel;
  const movementPeriodLabel =
    reportUiState.dateFilter.applied.startDate && reportUiState.dateFilter.applied.endDate
      ? `${movementPeriodContextLabel} - ${formatFilterDate(reportUiState.dateFilter.applied.startDate)} - ${formatFilterDate(reportUiState.dateFilter.applied.endDate)}`
      : movementPeriodContextLabel;
  const activeManualStockState = reportUiState.activePeriod === "periodB"
    ? manualStockState.periodB
    : manualStockState.periodA;
  const movementRows = reportUiState.sourceMode === "manual"
    ? activeManualStockState.rows
    : autoStockState.rows;
  const movementLoading = reportUiState.sourceMode === "manual"
    ? activeManualStockState.loading
    : autoStockState.loading;
  const movementError = reportUiState.sourceMode === "manual"
    ? activeManualStockState.error
    : autoStockState.error;
  const movementPage = autoStockState.pagination.page;
  const movementPageSize = autoStockState.pagination.pageSize;
  const totalMovementPages = Math.max(1, Math.ceil(movementRows.length / movementPageSize));
  const movementStartIndex = movementRows.length === 0 ? 0 : (movementPage - 1) * movementPageSize;
  const movementEndIndex = Math.min(movementStartIndex + movementPageSize, movementRows.length);
  const visibleMovementRows = movementRows.slice(movementStartIndex, movementEndIndex);
  const visiblePaginationItems: PaginationItem[] = (() => {
    if (totalMovementPages <= 7) {
      return Array.from({ length: totalMovementPages }, (_, index) => index + 1);
    }

    if (movementPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalMovementPages];
    }

    if (movementPage >= totalMovementPages - 3) {
      return [1, "...", totalMovementPages - 4, totalMovementPages - 3, totalMovementPages - 2, totalMovementPages - 1, totalMovementPages];
    }

    return [1, "...", movementPage - 1, movementPage, movementPage + 1, "...", totalMovementPages];
  })();

  const runReportsRefresh = useEffectEvent(async (options?: { force?: boolean }) => {
    if (reportUiState.sourceMode !== "auto") {
      return;
    }

    const requestKey = [
      reportUiState.sourceMode,
      reportUiState.activePeriod,
      reportUiState.dateFilter.applied.startDate,
      reportUiState.dateFilter.applied.endDate,
      reportUiState.search.trim().toLowerCase(),
    ].join(":");
    const params: Record<string, string> = {};

    if (reportUiState.dateFilter.applied.startDate) {
      params.start_date = reportUiState.dateFilter.applied.startDate;
    }

    if (reportUiState.dateFilter.applied.endDate) {
      params.end_date = reportUiState.dateFilter.applied.endDate;
    }

    if (reportUiState.search.trim()) {
      params.search = reportUiState.search.trim();
    }

    if (!options?.force) {
      const cachedFinanceState = financeSummaryCacheRef.current.get(requestKey);
      if (cachedFinanceState && Date.now() - cachedFinanceState.cachedAt < CLIENT_REPORT_CACHE_TTL_MS) {
        setFinanceState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          lastRequestKey: requestKey,
          lastLoadedAt: cachedFinanceState.lastLoadedAt,
          lastSyncAt: cachedFinanceState.lastSyncAt,
          orderCount: cachedFinanceState.orderCount,
          syncedOrderCount: cachedFinanceState.syncedOrderCount,
          metrics: cachedFinanceState.metrics,
        }));
      }

      if (autoRequestInFlightKeyRef.current === requestKey) {
        return;
      }

      const cachedState = autoStockCacheRef.current.get(requestKey);
      if (cachedState && Date.now() - cachedState.cachedAt < CLIENT_REPORT_CACHE_TTL_MS) {
        setAutoStockState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          warning: cachedState.warning,
          usingFallbackData: cachedState.usingFallbackData,
          rows: cachedState.rows,
          lastRequestKey: requestKey,
          lastLoadedAt: cachedState.lastLoadedAt,
          startDate: cachedState.startDate,
          endDate: cachedState.endDate,
          unmatchedInvoiceCount: cachedState.unmatchedInvoiceCount,
          unmatchedInvoices: cachedState.unmatchedInvoices,
        }));
        return;
      }

      if (autoStockState.lastRequestKey === requestKey && autoStockState.lastLoadedAt) {
        return;
      }
    }

    financeRequestAbortRef.current?.abort();
    autoRequestAbortRef.current?.abort();

    const financeController = new AbortController();
    const controller = new AbortController();
    financeRequestAbortRef.current = financeController;
    autoRequestAbortRef.current = controller;
    financeRequestInFlightKeyRef.current = requestKey;
    autoRequestInFlightKeyRef.current = requestKey;

    setFinanceState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      warning: null,
      usingFallbackData: false,
      lastRequestKey: requestKey,
    }));
    setAutoStockState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      lastRequestKey: requestKey,
    }));

    try {
      const [financeResponse, response] = await Promise.all([
        api.get("/v1/admin/reports/finance-summary", {
          params: {
            ...(params.start_date ? { start_date: params.start_date } : {}),
            ...(params.end_date ? { end_date: params.end_date } : {}),
          },
          signal: financeController.signal,
        }),
        api.get("/v1/admin/reports/warehouse-movement", {
          params,
          signal: controller.signal,
        }),
      ]);

      const financeData = typeof financeResponse.data?.data === "object" && financeResponse.data.data !== null
        ? financeResponse.data.data as JsonRecord
        : {};
      const financeMeta = typeof financeResponse.data?.meta === "object" && financeResponse.data.meta !== null
        ? financeResponse.data.meta as JsonRecord
        : {};
      const nextFinanceMetrics = {
        revenue: toNumberValue(financeData.revenue),
        cogs: toNumberValue(financeData.cogs),
        grossProfit: toNumberValue(financeData.gross_profit),
        operatingExpense: toNumberValue(financeData.operating_expense),
        netIncome: toNumberValue(financeData.net_income),
      };
      const nextFinanceLastLoadedAt = new Date().toISOString();

      financeSummaryCacheRef.current.set(requestKey, {
        cachedAt: Date.now(),
        lastLoadedAt: nextFinanceLastLoadedAt,
        lastSyncAt: toStringValue(financeMeta.last_sync_at) || nextFinanceLastLoadedAt,
        orderCount: toNumberValue(financeMeta.order_count),
        syncedOrderCount: toNumberValue(financeMeta.synced_order_count),
        metrics: nextFinanceMetrics,
      });

      setFinanceState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        lastLoadedAt: nextFinanceLastLoadedAt,
        lastSyncAt: toStringValue(financeMeta.last_sync_at) || nextFinanceLastLoadedAt,
        orderCount: toNumberValue(financeMeta.order_count),
        syncedOrderCount: toNumberValue(financeMeta.synced_order_count),
        metrics: nextFinanceMetrics,
      }));

      const payloadRows = Array.isArray(response.data?.data) ? response.data.data : [];
      const payloadMeta = typeof response.data?.meta === "object" && response.data.meta !== null ? response.data.meta as JsonRecord : {};
      const nextRows = payloadRows.map((row: JsonRecord) => ({
        key: toStringValue(row.key) || `${toStringValue(row.product_id)}:${toStringValue(row.warehouse)}`,
        warehouse: toStringValue(row.warehouse) || "-",
        product: toStringValue(row.product) || "-",
        unit: toStringValue(row.unit) || "Unit",
        openingBalance: toNumberValue(row.opening_balance),
        qtyIn: toNumberValue(row.qty_in),
        qtyOut: toNumberValue(row.qty_out),
        endingBalance: toNumberValue(row.ending_balance),
      }));
      const nextLastLoadedAt = new Date().toISOString();
      const nextWarning = toStringValue(payloadMeta.warning) || null;
      const usingFallbackData = Boolean(payloadMeta.using_fallback_data);
      const nextUnmatchedInvoices = Array.isArray(payloadMeta.unmatched_invoices)
        ? payloadMeta.unmatched_invoices.map((invoice) => {
            const item = typeof invoice === "object" && invoice !== null ? invoice as JsonRecord : {};

            return {
              invoiceId: toStringValue(item.invoice_id),
              transactionNo: toStringValue(item.transaction_no),
              transactionDate: toStringValue(item.transaction_date),
            };
          })
        : [];

      autoStockCacheRef.current.set(requestKey, {
        cachedAt: Date.now(),
        warning: nextWarning,
        usingFallbackData,
        rows: nextRows,
        lastLoadedAt: nextLastLoadedAt,
        startDate: toStringValue(payloadMeta.start_date),
        endDate: toStringValue(payloadMeta.end_date),
        unmatchedInvoiceCount: toNumberValue(payloadMeta.unmatched_invoice_count),
        unmatchedInvoices: nextUnmatchedInvoices,
      });

      setAutoStockState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        warning: nextWarning,
        usingFallbackData,
        rows: nextRows,
        lastLoadedAt: nextLastLoadedAt,
        startDate: toStringValue(payloadMeta.start_date),
        endDate: toStringValue(payloadMeta.end_date),
        unmatchedInvoiceCount: toNumberValue(payloadMeta.unmatched_invoice_count),
        unmatchedInvoices: nextUnmatchedInvoices,
      }));
    } catch (error) {
      if (controller.signal.aborted || financeController.signal.aborted) {
        return;
      }

      const statusCode = isAxiosError(error) ? error.response?.status ?? 0 : 0;
      const message =
        statusCode === 401 || statusCode === 419
          ? "Sesi admin sudah berakhir. Silakan login ulang lalu muat ulang halaman laporan."
          : statusCode === 403
            ? "Anda tidak memiliki akses untuk melihat laporan ini."
            : statusCode === 422
              ? "Filter laporan tidak valid. Periksa kembali periode yang dipilih."
              : statusCode === 429
                ? "Terlalu banyak permintaan ke laporan. Coba beberapa saat lagi."
                : statusCode >= 500
                  ? "Server sedang bermasalah saat memuat laporan gudang. Coba lagi sebentar."
                  : (isAxiosError(error) &&
                    typeof error.response?.data?.message === "string" &&
                    error.response.data.message) ||
                    (error instanceof Error ? error.message : "Gagal memuat pergerakan barang gudang.");

      setFinanceState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      setAutoStockState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        warning: null,
        usingFallbackData: false,
        rows: [],
        startDate: "",
        endDate: "",
        unmatchedInvoiceCount: 0,
        unmatchedInvoices: [],
      }));
    } finally {
      if (financeRequestAbortRef.current === financeController) {
        financeRequestAbortRef.current = null;
      }

      if (financeRequestInFlightKeyRef.current === requestKey) {
        financeRequestInFlightKeyRef.current = null;
      }

      if (autoRequestAbortRef.current === controller) {
        autoRequestAbortRef.current = null;
      }

      if (autoRequestInFlightKeyRef.current === requestKey) {
        autoRequestInFlightKeyRef.current = null;
      }
    }
  });

  useEffect(() => {
    void runReportsRefresh({ force: refreshNonce > 0 });

    return () => {
      financeRequestAbortRef.current?.abort();
      autoRequestAbortRef.current?.abort();
    };
  }, [
    refreshNonce,
    reportUiState.sourceMode,
    reportUiState.activePeriod,
    reportUiState.dateFilter.applied.endDate,
    reportUiState.dateFilter.applied.startDate,
    reportUiState.search,
  ]);

  useEffect(() => {
    if (movementPage > totalMovementPages) {
      setAutoStockState((prev) => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          page: totalMovementPages,
        },
      }));
    }
  }, [movementPage, totalMovementPages]);

  useEffect(() => {
    if (!isSummaryPeriodPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (summaryPeriodPickerRef.current?.contains(target)) {
        return;
      }

      setIsSummaryPeriodPickerOpen(false);
      setSummaryPeriodError(null);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isSummaryPeriodPickerOpen]);

  const unmatchedInvoicePreview = autoStockState.unmatchedInvoices.slice(0, 3);
  const handleSyncReports = () => {
    setReportUiState((prev) => ({
      ...prev,
      sourceMode: "auto",
    }));
    setRefreshNonce((prev) => prev + 1);
  };
  const handleSummaryQuickRangeSelect = (preset: ReportPeriodPresetKey) => {
    const resolved = resolvePresetDateFilter(preset);

    setReportUiState((prev) => ({
      ...prev,
      periodPresetDraft: preset,
      dateFilter: {
        ...prev.dateFilter,
        draft: resolved.filter,
      },
    }));
    setSummaryPeriodError(null);
  };
  const handleSummaryDateInputChange = (field: keyof ReportDateFilter, value: string) => {
    setReportUiState((prev) => ({
      ...prev,
      periodPresetDraft: "custom",
      dateFilter: {
        ...prev.dateFilter,
        draft: {
          ...prev.dateFilter.draft,
          [field]: value,
        },
      },
    }));
    setSummaryPeriodError(null);
  };
  const handleSummaryPeriodReset = () => {
    handleSummaryQuickRangeSelect("all");
  };
  const handleOpenSummaryPeriodPicker = () => {
    setReportUiState((prev) => ({
      ...prev,
      periodPresetDraft: prev.periodPresetApplied,
      dateFilter: {
        draft: prev.dateFilter.applied,
        applied: prev.dateFilter.applied,
      },
    }));
    setSummaryPeriodError(null);
    setIsSummaryPeriodPickerOpen(true);
  };
  const handleSummaryPeriodApply = () => {
    const draftFilter = reportUiState.dateFilter.draft;

    if ((draftFilter.startDate && !draftFilter.endDate) || (!draftFilter.startDate && draftFilter.endDate)) {
      setSummaryPeriodError("Tanggal mulai dan selesai harus diisi bersamaan.");
      return;
    }

    if (
      draftFilter.startDate &&
      draftFilter.endDate &&
      new Date(draftFilter.startDate).getTime() > new Date(draftFilter.endDate).getTime()
    ) {
      setSummaryPeriodError("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.");
      return;
    }

    const nextActivePeriod =
      reportUiState.periodPresetDraft === "periodA" || reportUiState.periodPresetDraft === "periodB"
        ? reportUiState.periodPresetDraft
        : "custom";

    setReportUiState((prev) => ({
      ...prev,
      sourceMode: "auto",
      activePeriod: nextActivePeriod,
      periodPresetApplied: prev.periodPresetDraft,
      dateFilter: {
        draft: prev.dateFilter.draft,
        applied: prev.dateFilter.draft,
      },
    }));
    setAutoStockState((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        page: 1,
      },
    }));
    setSummaryPeriodError(null);
    setIsSummaryPeriodPickerOpen(false);
    setRefreshNonce((prev) => prev + 1);
  };
  const handlePresetPeriodSync = (preset: Extract<ReportPeriodPresetKey, "periodA" | "periodB">) => {
    const resolved = resolvePresetDateFilter(preset);

    setReportUiState((prev) => ({
      ...prev,
      sourceMode: "auto",
      activePeriod: resolved.activePeriod,
      periodPresetDraft: preset,
      periodPresetApplied: preset,
      dateFilter: {
        draft: resolved.filter,
        applied: resolved.filter,
      },
    }));
    setAutoStockState((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        page: 1,
      },
    }));
    setSummaryPeriodError(null);
    setRefreshNonce((prev) => prev + 1);
  };
  const summaryCards = SUMMARY_CARD_DEFINITIONS.map((card) => ({
    ...card,
    value: formatCompactCurrency(financeState.metrics[card.key]),
    note:
      card.key === "netIncome"
        ? `${financeState.syncedOrderCount} order sudah sinkron ke Jurnal`
        : `${financeState.orderCount} order tercatat di periode ini`,
  }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Laporan</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Ringkasan laba rugi untuk pemantauan performa bisnis.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Section ini masih berupa tampilan awal. Data disusun statis terlebih dahulu agar struktur halaman laporan bisa kita rapikan sebelum dihubungkan ke sumber data.
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-600 shadow-sm sm:min-w-[280px]">
              <button
                type="button"
                onClick={handleSyncReports}
                disabled={autoStockState.loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <RefreshCcw className={`h-4 w-4 ${autoStockState.loading ? "animate-spin" : ""}`} />
                {autoStockState.loading ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
              </button>

              <div className="flex items-center gap-2 text-blue-700">
                <CalendarRange className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">Periode aktif</span>
              </div>
              <p className="text-base font-semibold text-slate-900">{appliedPeriodHeadingLabel}</p>
              <button
                type="button"
                onClick={() => {
                  handleOpenSummaryPeriodPicker();
                }}
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
              >
                <ArrowUpRight className="h-4 w-4" />
                Ganti Periode
              </button>
            </div>
          </div>
        </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ringkasan Laba Rugi</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{appliedPeriodHeadingLabel}</h2>
              </div>

              <div className="relative w-full max-w-[420px]" ref={summaryPeriodPickerRef}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Periode</p>
                <button
                  type="button"
                  onClick={() => {
                    if (isSummaryPeriodPickerOpen) {
                      setIsSummaryPeriodPickerOpen(false);
                      setSummaryPeriodError(null);
                      return;
                    }

                    handleOpenSummaryPeriodPicker();
                  }}
                  className={`mt-3 flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left text-sm font-medium transition ${
                    isSummaryPeriodPickerOpen
                      ? "border-blue-500 shadow-[0_12px_30px_rgba(37,99,235,0.12)]"
                      : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                >
                  <span className="text-slate-900">{appliedPeriodTriggerLabel}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 transition ${isSummaryPeriodPickerOpen ? "rotate-180 text-blue-600" : ""}`}
                  />
                </button>

                {isSummaryPeriodPickerOpen ? (
                  <div className="absolute right-0 z-20 mt-3 w-full max-w-[400px] rounded-[24px] border border-[#d8e3ff] bg-white p-6 shadow-[0_20px_48px_rgba(15,23,42,0.16)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rentang Cepat</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSummaryPeriodPickerOpen(false);
                          setSummaryPeriodError(null);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {SUMMARY_QUICK_RANGE_LAYOUT.map((row) => (
                        <div
                          key={row.join("-")}
                          className={`grid gap-2.5 ${row.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
                        >
                          {row.map((rangeKey) => {
                            const range = SUMMARY_QUICK_RANGES.find((item) => item.key === rangeKey);
                            if (!range) {
                              return null;
                            }

                            return (
                              <button
                                key={range.key}
                                type="button"
                                onClick={() => handleSummaryQuickRangeSelect(range.key)}
                                className={`inline-flex min-h-10 items-center justify-center rounded-[18px] border px-3.5 py-2.5 text-sm font-semibold transition ${
                                  reportUiState.periodPresetDraft === range.key
                                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.08)]"
                                    : "border-[#d9e2f5] bg-[#f5f8ff] text-slate-700 hover:border-slate-300 hover:bg-white"
                                }`}
                              >
                                {range.label}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pilih Tanggal</p>

                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Mulai
                          </label>
                          <input
                            type="date"
                            value={reportUiState.dateFilter.draft.startDate}
                            onChange={(event) => handleSummaryDateInputChange("startDate", event.target.value)}
                            className="mt-2 h-12 w-full rounded-[18px] border border-[#d9e2f5] bg-[#f5f8ff] px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Selesai
                          </label>
                          <input
                            type="date"
                            value={reportUiState.dateFilter.draft.endDate}
                            onChange={(event) => handleSummaryDateInputChange("endDate", event.target.value)}
                            className="mt-2 h-12 w-full rounded-[18px] border border-[#d9e2f5] bg-[#f5f8ff] px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {summaryPeriodError ? (
                      <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {summaryPeriodError}
                      </p>
                    ) : null}

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSummaryPeriodReset}
                        className="inline-flex flex-1 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-200"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleSummaryPeriodApply}
                        className="inline-flex flex-1 items-center justify-center rounded-[18px] bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.label}
                    className={`rounded-[24px] border p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${card.tone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{card.label}</p>
                        <p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p>
                      </div>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <p className="mt-4 text-xs leading-6 text-slate-600">{card.note}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="xl:w-[320px]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sumber Data</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">Mekari Jurnal</h3>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Tersambung
                </span>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Akun Laporan Keuangan</p>
                  <p className="truncate text-xs text-slate-500">
                    Sinkronisasi terakhir: {financeState.lastSyncAt ? formatDateTimeLabel(financeState.lastSyncAt) : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Basis data</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">Laba rugi / jurnal umum</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Catatan</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Komponen laporan masih berupa placeholder UI. Mapping akun dan data API bisa kita sambungkan di tahap berikutnya.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Pergerakan Barang Gudang
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Pergerakan Barang Gudang
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pantau arus stok setiap gudang berdasarkan data Mekari Jurnal.
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
              {movementLoading
                ? movementRows.length > 0
                  ? "Memperbarui data..."
                  : "Memuat..."
                : `${movementRows.length === 0 ? 0 : movementStartIndex + 1}-${movementEndIndex} dari ${movementRows.length}`}
            </div>
          </div>
        </div>

        {movementError ? (
          <div className="px-6 py-5 sm:px-8">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              <p>{movementError}</p>
              <button
                type="button"
                onClick={() => setRefreshNonce((prev) => prev + 1)}
                className="mt-3 inline-flex items-center rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 sm:px-8">
            <div className="mb-6 flex flex-col gap-6">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-blue-500 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(37,99,235,0.08)]">
                  <p className="text-xl font-semibold text-slate-950">Otomatis (API)</p>
                  <p className="mt-1 text-sm text-slate-700">Menggunakan integrasi Mekari</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-100/80 px-5 py-4">
                  <p className="text-xl font-semibold text-slate-950">Upload Manual</p>
                  <p className="mt-1 text-sm text-slate-700">Unggah Excel 30 hari ke belakang</p>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handlePresetPeriodSync("periodA")}
                    className={`inline-flex items-center rounded-2xl border px-4 py-3 text-base font-semibold transition ${
                      reportUiState.activePeriod === "periodA"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.08)]"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Periode A
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetPeriodSync("periodB")}
                    className={`inline-flex items-center rounded-2xl border px-4 py-3 text-base font-semibold transition ${
                      reportUiState.activePeriod === "periodB"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.08)]"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Periode B
                  </button>
                </div>

                <p className="mt-4 text-[15px] leading-7 text-slate-700">
                  Periode Pergerakan Barang otomatis diambil dari API Mekari Jurnal.
                </p>

                <ul className="mt-3 list-disc space-y-1 pl-6 text-[15px] leading-7 text-slate-700">
                  <li>Periode A: tanggal 1-15 setiap bulan.</li>
                  <li>Periode B: tanggal 16-30/31 setiap bulan.</li>
                  <li>Tidak perlu unggah manual; gunakan tombol sinkron untuk memperbarui.</li>
                </ul>

                <p className="mt-4 text-base font-medium text-slate-900">
                  {autoStockState.startDate && autoStockState.endDate
                    ? `${movementPeriodContextLabel} - ${formatInvoiceDate(autoStockState.startDate)} - ${formatInvoiceDate(autoStockState.endDate)}`
                    : movementPeriodLabel}
                </p>
              </div>
            </div>

            {!movementLoading && autoStockState.unmatchedInvoiceCount > 0 ? (
              <div className="mb-6 rounded-[24px] border border-amber-200 bg-amber-50/80 p-5 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                      <p className="text-sm font-semibold">Invoice Jurnal Belum Match ke Order Lokal</p>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-amber-900">
                      Ada {autoStockState.unmatchedInvoiceCount} invoice pada {movementPeriodContextLabel.toLowerCase()} yang berhasil dibaca dari Mekari Jurnal, tetapi belum menemukan order lokal tersinkron.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600">Invoice Tidak Match</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-900">{autoStockState.unmatchedInvoiceCount}</p>
                  </div>
                </div>

                {unmatchedInvoicePreview.length > 0 ? (
                  <>
                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                      {unmatchedInvoicePreview.map((invoice) => (
                        <article
                          key={`${invoice.invoiceId}:${invoice.transactionNo}:${invoice.transactionDate}`}
                          className="rounded-2xl border border-amber-200 bg-white/90 px-4 py-3"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600">Referensi Invoice</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {invoice.transactionNo || invoice.invoiceId || "-"}
                          </p>
                          <p className="mt-2 text-xs text-slate-600">
                            Tanggal: {formatInvoiceDate(invoice.transactionDate)}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID Invoice: {invoice.invoiceId || "-"}
                          </p>
                        </article>
                      ))}
                    </div>

                    {autoStockState.unmatchedInvoiceCount > unmatchedInvoicePreview.length ? (
                      <p className="mt-3 text-xs font-medium text-amber-700">
                        +{autoStockState.unmatchedInvoiceCount - unmatchedInvoicePreview.length} invoice lainnya perlu dicek.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {!movementLoading && autoStockState.warning ? (
              <div className="mb-6 rounded-[24px] border border-amber-200 bg-amber-50/80 p-5 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Sinkronisasi Mekari Jurnal Sedang Bermasalah</p>
                    <p className="mt-1 text-sm leading-7 text-amber-800">{autoStockState.warning}</p>
                    {autoStockState.usingFallbackData ? (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        Data tabel tetap ditampilkan dari stok lokal agar laporan tidak kosong.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Gudang
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Produk
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Satuan
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Saldo Awal
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Qty Masuk
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Qty Keluar
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Saldo Akhir
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movementLoading && movementRows.length === 0 ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`movement-skeleton-${index}`}>
                        <td className="border-b border-slate-100 px-3 py-4">
                          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4">
                          <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4">
                          <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-right">
                          <div className="ml-auto h-4 w-10 animate-pulse rounded bg-slate-100" />
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-right">
                          <div className="ml-auto h-4 w-10 animate-pulse rounded bg-slate-100" />
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-right">
                          <div className="ml-auto h-4 w-10 animate-pulse rounded bg-slate-100" />
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-right">
                          <div className="ml-auto h-4 w-12 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : visibleMovementRows.length > 0 ? (
                    visibleMovementRows.map((row) => (
                      <tr key={row.key} className={`transition hover:bg-slate-50/80 ${movementLoading ? "opacity-70" : ""}`}>
                        <td className="border-b border-slate-100 px-3 py-4 text-sm font-medium text-slate-700">
                          {row.warehouse}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-sm text-slate-700">
                          {row.product}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-sm text-slate-600">
                          {row.unit}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-right text-sm text-slate-700">
                          {formatQuantity(row.openingBalance)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-right text-sm text-slate-700">
                          {formatQuantity(row.qtyIn)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-right text-sm text-slate-700">
                          {formatQuantity(row.qtyOut)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-4 text-right text-sm font-semibold text-slate-900">
                          {formatQuantity(row.endingBalance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-500">
                        Belum ada data produk Mekari Jurnal yang bisa ditampilkan pada tabel gudang.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!movementLoading && movementRows.length > 0 ? (
              <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Navigasi Data</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    Menampilkan {movementStartIndex + 1}-{movementEndIndex} dari {movementRows.length} produk
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setAutoStockState((prev) => ({
                        ...prev,
                        pagination: {
                          ...prev.pagination,
                          page: Math.max(1, prev.pagination.page - 1),
                        },
                      }))
                    }
                    disabled={movementPage === 1}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                  >
                    Sebelumnya
                  </button>

                  <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50/70 p-2">
                    {visiblePaginationItems.map((item, index) =>
                      typeof item !== "number" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="inline-flex h-10 min-w-10 items-center justify-center text-sm font-semibold text-slate-400"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setAutoStockState((prev) => ({
                              ...prev,
                              pagination: {
                                ...prev.pagination,
                                page: item,
                              },
                            }))
                          }
                          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                            movementPage === item
                              ? "border-blue-500 bg-white text-blue-700 shadow-[0_8px_18px_rgba(37,99,235,0.14)]"
                              : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAutoStockState((prev) => ({
                        ...prev,
                        pagination: {
                          ...prev.pagination,
                          page: Math.min(totalMovementPages, prev.pagination.page + 1),
                        },
                      }))
                    }
                    disabled={movementPage === totalMovementPages}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
