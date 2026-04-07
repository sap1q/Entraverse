"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileDown,
  ListFilter,
  Loader2,
  Megaphone,
  MoreVertical,
  PackageSearch,
  Plus,
  Search,
  Truck,
  Trash2,
  X,
} from "lucide-react";
import api, { isAxiosError } from "@/lib/axios";

type SalesOrderStatus = "dibayar" | "diproses" | "dikirim" | "terkirim" | "selesai" | "dibatalkan";

type SalesOrderItem = {
  id: string;
  product_name: string;
  variant_name: string | null;
  variant_sku: string;
  warehouse: string;
  quantity: number;
  unit_price: number;
  landed_cost: number;
  line_total: number;
  product_image?: string | null;
};

type SalesOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  status: SalesOrderStatus;
  payment_status?: string | null;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  shipping_courier?: string | null;
  shipping_service?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  notes?: string | null;
  items: SalesOrderItem[];
  created_at: string;
};

type AdminOrderStatusOption = "pending" | "paid" | "diproses" | "dikirim" | "terkirim" | "selesai" | "dibatalkan";

type FulfillmentAction = "confirm" | "ship" | "cancel";

type FulfillmentPayload = {
  orderId: string;
  action: FulfillmentAction;
  tracking_number?: string;
  tracking_url?: string;
  shipping_courier?: string;
  shipping_service?: string;
  note?: string;
};

type StatusUpdatePayload = {
  orderId: string;
  status: AdminOrderStatusOption;
};

type FulfillmentModalState = {
  kind: FulfillmentAction;
  order: SalesOrder;
};

type NoticeState = {
  tone: "success" | "error";
  message: string;
};

type SortOption = "latest" | "oldest" | "amount_desc" | "amount_asc";

type CatalogWarehouse = {
  warehouse: string;
  stock: number;
};

type SalesCatalogItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_spu: string;
  variant_sku: string;
  variant_name: string;
  warehouse_stock: CatalogWarehouse[];
  available_stock: number;
  landed_cost: number;
  unit_price: number;
};

type OrdersResponse = {
  data: SalesOrder[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

type ItemDraft = {
  key: string;
  catalog_id: string;
  warehouse: string;
  quantity: number;
};

type FormState = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  status: SalesOrderStatus;
  shipping_cost: number;
  discount_amount: number;
  notes: string;
  items: ItemDraft[];
};

type CreatePayload = {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  status: SalesOrderStatus;
  shipping_cost: number;
  discount_amount: number;
  notes?: string;
  items: Array<{
    product_id: string;
    variant_sku: string;
    warehouse: string;
    quantity: number;
    unit_price: number;
  }>;
};

const statusLabel: Record<SalesOrderStatus, string> = {
  dibayar: "Menunggu Pembayaran",
  diproses: "Diproses",
  dikirim: "Dikirim",
  terkirim: "Pesanan Terkirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const statusStyle: Record<SalesOrderStatus, string> = {
  dibayar: "text-amber-700",
  diproses: "text-blue-700",
  dikirim: "text-sky-700",
  terkirim: "text-indigo-700",
  selesai: "text-emerald-700",
  dibatalkan: "text-rose-700",
};

const statusAccentStyle: Record<SalesOrderStatus, string> = {
  dibayar: "bg-amber-500",
  diproses: "bg-blue-500",
  dikirim: "bg-sky-500",
  terkirim: "bg-indigo-500",
  selesai: "bg-emerald-500",
  dibatalkan: "bg-rose-500",
};

const SUCCESS_PAYMENT_STATUSES = new Set(["settlement", "capture", "paid"]);
const FAILED_PAYMENT_STATUSES = new Set(["cancel", "deny", "expire", "expired", "failure", "failed"]);
const orderGridClass =
  "lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.9fr)_minmax(0,1.08fr)_minmax(0,0.92fr)_minmax(136px,0.78fr)_minmax(160px,0.9fr)_56px]";
const progressStages = [
  "Menunggu Pembayaran",
  "Dibayar",
  "Diproses",
  "Dikirim",
  "Pesanan Terkirim",
  "Selesai",
] as const;
const filterTabs = [
  { value: "all", label: "Semua" },
  { value: "dibayar", label: "Menunggu Pembayaran" },
  { value: "diproses", label: "Diproses" },
  { value: "dikirim", label: "Dikirim" },
  { value: "terkirim", label: "Pesanan Terkirim" },
  { value: "selesai", label: "Selesai" },
  { value: "dibatalkan", label: "Dibatalkan" },
] as const;
const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "latest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "amount_desc", label: "Total tertinggi" },
  { value: "amount_asc", label: "Total terendah" },
];
const adminStatusOptions: Array<{ value: AdminOrderStatusOption; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Dibayar" },
  { value: "diproses", label: "Diproses" },
  { value: "dikirim", label: "Dikirim" },
  { value: "terkirim", label: "Pesanan Terkirim" },
  { value: "selesai", label: "Selesai" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

const endpoint = (): string => {
  const base = String(api.defaults.baseURL ?? "").toLowerCase();
  return base.endsWith("/v1") || base.includes("/api/v1") ? "/admin/sales-orders" : "/v1/admin/sales-orders";
};

const catalogEndpoint = (): string => `${endpoint()}/catalog`;

const resolveBadgeLabel = (order: Pick<SalesOrder, "status" | "payment_status">): string => {
  const paymentStatus = String(order.payment_status ?? "").trim().toLowerCase();

  if (order.status === "dibayar" && SUCCESS_PAYMENT_STATUSES.has(paymentStatus)) {
    return "Dibayar";
  }

  if (order.status === "dibayar" && FAILED_PAYMENT_STATUSES.has(paymentStatus)) {
    return "Gagal";
  }

  return statusLabel[order.status];
};

const resolveMenuStatusValue = (order: Pick<SalesOrder, "status" | "payment_status">): AdminOrderStatusOption => {
  const paymentStatus = String(order.payment_status ?? "").trim().toLowerCase();

  if (order.status === "dibatalkan" || FAILED_PAYMENT_STATUSES.has(paymentStatus)) {
    return "dibatalkan";
  }

  if (order.status === "selesai") return "selesai";
  if (order.status === "terkirim") return "terkirim";
  if (order.status === "dikirim") return "dikirim";
  if (order.status === "diproses") return "diproses";
  if (order.status === "dibayar" && SUCCESS_PAYMENT_STATUSES.has(paymentStatus)) return "paid";

  return "pending";
};

const resolveBadgeClassName = (order: Pick<SalesOrder, "status" | "payment_status">): string => {
  const paymentStatus = String(order.payment_status ?? "").trim().toLowerCase();

  if (order.status === "dibayar" && SUCCESS_PAYMENT_STATUSES.has(paymentStatus)) {
    return "text-blue-700";
  }

  if (order.status === "dibayar" && FAILED_PAYMENT_STATUSES.has(paymentStatus)) {
    return "text-rose-700";
  }

  return statusStyle[order.status];
};

const resolveBadgeAccent = (order: Pick<SalesOrder, "status" | "payment_status">): string => {
  const paymentStatus = String(order.payment_status ?? "").trim().toLowerCase();

  if (order.status === "dibayar" && SUCCESS_PAYMENT_STATUSES.has(paymentStatus)) {
    return "bg-blue-500";
  }

  if (order.status === "dibayar" && FAILED_PAYMENT_STATUSES.has(paymentStatus)) {
    return "bg-rose-500";
  }

  return statusAccentStyle[order.status];
};

const resolveProgressStep = (order: Pick<SalesOrder, "status" | "payment_status">): number => {
  const paymentStatus = String(order.payment_status ?? "").trim().toLowerCase();

  if (order.status === "dibatalkan" || FAILED_PAYMENT_STATUSES.has(paymentStatus)) return 0;
  if (order.status === "selesai") return 6;
  if (order.status === "terkirim") return 5;
  if (order.status === "dikirim") return 4;
  if (order.status === "diproses") return 3;
  if (order.status === "dibayar" && SUCCESS_PAYMENT_STATUSES.has(paymentStatus)) return 2;
  return 1;
};

const formatOrderDate = (value: string): string =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

const formatOrderTime = (value: string): string =>
  `${new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))} WIB`;

const getOrderTimestamp = (value: string): number => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getPrimaryItem = (order: SalesOrder): SalesOrderItem | null => order.items[0] ?? null;

const getOrderPrimaryProduct = (order: SalesOrder): string => {
  const primaryItem = getPrimaryItem(order);
  if (!primaryItem) return "-";

  const extraItems = Math.max(0, order.items.length - 1);
  return extraItems > 0 ? `${primaryItem.product_name} (+${extraItems} item lainnya)` : primaryItem.product_name;
};

const getShippingMethodLabel = (order: SalesOrder): string => {
  const courier = String(order.shipping_courier ?? "").trim();
  const service = String(order.shipping_service ?? "").trim();

  if (courier && service) {
    return `${courier.toUpperCase()} - ${service}`;
  }

  if (courier) {
    return courier.toUpperCase();
  }

  if (service) {
    return service;
  }

  return "Belum diatur";
};

const getShippingMethodMeta = (order: SalesOrder): string => {
  if (order.tracking_number) {
    return `Resi ${order.tracking_number}`;
  }

  if (order.shipping_courier || order.shipping_service) {
    return "Pengiriman admin / marketplace";
  }

  return "Belum diatur";
};

const canTrackOrder = (order: Pick<SalesOrder, "status" | "tracking_number" | "tracking_url">): boolean =>
  ["dikirim", "terkirim", "selesai"].includes(order.status) &&
  (String(order.tracking_url ?? "").trim() !== "" || String(order.tracking_number ?? "").trim() !== "");

const resolveTrackingPageUrl = (order: Pick<SalesOrder, "shipping_courier" | "tracking_number" | "tracking_url">): string | null => {
  const explicitUrl = String(order.tracking_url ?? "").trim();
  if (explicitUrl !== "") {
    return explicitUrl;
  }

  const trackingNumber = String(order.tracking_number ?? "").trim();
  if (trackingNumber === "") {
    return null;
  }

  const normalizedCourier = String(order.shipping_courier ?? "").trim().toLowerCase().replace(/\s+/g, "");

  if (normalizedCourier.includes("jne")) {
    return "https://www.jne.co.id/id/tracking";
  }

  if (normalizedCourier.includes("jnt") || normalizedCourier.includes("j&t")) {
    return "https://jet.co.id/track";
  }

  if (normalizedCourier.includes("pos")) {
    return "https://www.posindonesia.co.id/id/tracking";
  }

  if (normalizedCourier.includes("sicepat")) {
    return "https://www.sicepat.com/checkAwb";
  }

  if (normalizedCourier.includes("anteraja")) {
    return "https://anteraja.id/tracking";
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`${order.shipping_courier ?? "kurir"} tracking ${trackingNumber}`)}`;
};

const isPaidOrder = (order: Pick<SalesOrder, "status" | "payment_status">): boolean => {
  const paymentStatus = String(order.payment_status ?? "").trim().toLowerCase();

  if (SUCCESS_PAYMENT_STATUSES.has(paymentStatus)) {
    return true;
  }

  return ["diproses", "dikirim", "terkirim", "selesai"].includes(order.status);
};

const canConfirmOrder = (order: Pick<SalesOrder, "status" | "payment_status">): boolean =>
  order.status === "dibayar" && isPaidOrder(order);

const canShipOrder = (order: Pick<SalesOrder, "status" | "payment_status">): boolean =>
  isPaidOrder(order) && ["diproses", "dikirim"].includes(order.status);

const canCancelOrder = (order: Pick<SalesOrder, "status" | "payment_status">): boolean =>
  !isPaidOrder(order) && !["dikirim", "terkirim", "selesai", "dibatalkan"].includes(order.status);

const canDeleteOrder = (order: Pick<SalesOrder, "status" | "payment_status">): boolean =>
  !isPaidOrder(order) && !["diproses", "dikirim", "terkirim", "selesai"].includes(order.status);

const idr = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const getError = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    if (typeof error.response?.data?.message === "string") return error.response.data.message;
    const first = error.response?.data?.errors ? Object.values(error.response.data.errors)[0] : null;
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const fetchOrders = async (search: string, status: string, page: number): Promise<OrdersResponse> => {
  const response = await api.get(endpoint(), {
    params: {
      search: search || undefined,
      status: status === "all" ? undefined : status,
      page,
      per_page: 10,
    },
  });

  return {
    data: Array.isArray(response.data?.data) ? response.data.data : [],
    pagination: response.data?.pagination ?? {
      current_page: 1,
      per_page: 10,
      total: 0,
      last_page: 1,
    },
  };
};

const fetchCatalog = async (search: string): Promise<SalesCatalogItem[]> => {
  const response = await api.get(catalogEndpoint(), {
    params: { search: search || undefined },
  });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

const createOrder = async (payload: CreatePayload): Promise<SalesOrder> => {
  const response = await api.post(endpoint(), payload);
  if (!response.data?.data) throw new Error("Create order response invalid.");
  return response.data.data as SalesOrder;
};

const deleteOrder = async (orderId: string): Promise<void> => {
  await api.delete(`${endpoint()}/${orderId}`);
};

const updateFulfillment = async ({
  orderId,
  action,
  tracking_number,
  tracking_url,
  shipping_courier,
  shipping_service,
  note,
}: FulfillmentPayload): Promise<SalesOrder> => {
  const response = await api.patch(`${endpoint()}/${orderId}/fulfillment`, {
    action,
    tracking_number: tracking_number || undefined,
    tracking_url: tracking_url || undefined,
    shipping_courier: shipping_courier || undefined,
    shipping_service: shipping_service || undefined,
    note: note || undefined,
  });

  if (!response.data?.data) {
    throw new Error("Update fulfillment response invalid.");
  }

  return response.data.data as SalesOrder;
};

const updateOrderStatus = async ({ orderId, status }: StatusUpdatePayload): Promise<SalesOrder> => {
  const response = await api.patch(`${endpoint()}/${orderId}/status`, { status });

  if (!response.data?.data) {
    throw new Error("Update status response invalid.");
  }

  return response.data.data as SalesOrder;
};

const emptyItem = (): ItemDraft => ({
  key: crypto.randomUUID(),
  catalog_id: "",
  warehouse: "",
  quantity: 1,
});

const initialForm = (): FormState => ({
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_address: "",
  status: "diproses",
  shipping_cost: 0,
  discount_amount: 0,
  notes: "",
  items: [emptyItem()],
});

const printInvoice = (order: SalesOrder): void => {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=860,height=720");
  if (!popup) return;
  const rows = order.items
    .map((item, index) => `<tr><td>${index + 1}</td><td>${item.product_name} (${item.variant_sku})</td><td>${item.warehouse}</td><td>${item.quantity}</td><td>${idr(item.unit_price)}</td><td>${idr(item.line_total)}</td></tr>`)
    .join("");

  popup.document.write(`
    <html>
      <head>
        <title>Invoice ${order.order_number}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:28px;color:#0f172a}
          .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
          .title{font-size:22px;font-weight:700}
          table{width:100%;border-collapse:collapse}
          th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:left}
          th{background:#eff6ff;color:#1d4ed8}
          .sum{margin-top:12px;display:flex;justify-content:flex-end}
          .sum table{width:320px}
          .sum td{border:none;padding:4px 0}
        </style>
      </head>
      <body>
        <div class="head">
          <div>
            <div class="title">Invoice Penjualan</div>
            <div>No: ${order.order_number}</div>
            <div>${new Date(order.created_at).toLocaleString("id-ID")}</div>
          </div>
          <div>Entraverse Admin</div>
        </div>
        <div style="margin-bottom:10px">Customer: <strong>${order.customer_name}</strong></div>
        <table>
          <thead><tr><th>#</th><th>Produk</th><th>Warehouse</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="sum">
          <table>
            <tr><td>Subtotal</td><td style="text-align:right">${idr(order.subtotal)}</td></tr>
            <tr><td>Shipping</td><td style="text-align:right">${idr(order.shipping_cost)}</td></tr>
            <tr><td>Discount</td><td style="text-align:right">${idr(order.discount_amount)}</td></tr>
            <tr><td><strong>Grand Total</strong></td><td style="text-align:right"><strong>${idr(order.total_amount)}</strong></td></tr>
          </table>
        </div>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
};

export default function SalesOrderManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | SalesOrderStatus>("all");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [page, setPage] = useState(1);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
  const [openStatusMenuOrderId, setOpenStatusMenuOrderId] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<FulfillmentModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [fulfillmentForm, setFulfillmentForm] = useState({
    tracking_number: "",
    tracking_url: "",
    shipping_courier: "",
    shipping_service: "",
    note: "",
  });
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!openMenuOrderId && !openStatusMenuOrderId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("[data-admin-order-menu='true']") && !target.closest("[data-admin-status-menu='true']")) {
        setOpenMenuOrderId(null);
        setOpenStatusMenuOrderId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuOrderId(null);
        setOpenStatusMenuOrderId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuOrderId, openStatusMenuOrderId]);

  const ordersQuery = useQuery({
    queryKey: ["sales-orders", { search, status, page }],
    queryFn: () => fetchOrders(search, status, page),
    placeholderData: (prev) => prev,
  });

  const catalogQuery = useQuery({
    queryKey: ["sales-catalog", catalogSearch],
    queryFn: () => fetchCatalog(catalogSearch),
    enabled: openCreate,
  });

  const catalogMap = useMemo(() => {
    const map = new Map<string, SalesCatalogItem>();
    (catalogQuery.data ?? []).forEach((entry) => map.set(entry.id, entry));
    return map;
  }, [catalogQuery.data]);

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      setOpenCreate(false);
      setForm(initialForm());
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
    },
    onError: (error) => setFormError(getError(error, "Gagal membuat order.")),
  });

  const orders = useMemo(() => ordersQuery.data?.data ?? [], [ordersQuery.data?.data]);
  const pagination = useMemo(
    () => ordersQuery.data?.pagination ?? { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    [ordersQuery.data?.pagination]
  );

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      setDeleteTarget(null);
      setOpenMenuOrderId(null);
      setNotice({
        tone: "success",
        message: "Pesanan berhasil dihapus.",
      });

      if (orders.length === 1 && page > 1) {
        setPage((previous) => Math.max(1, previous - 1));
      }

      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
    },
    onError: (error) => {
      setNotice({
        tone: "error",
        message: getError(error, "Pesanan tidak dapat dihapus."),
      });
    },
  });

  const fulfillmentMutation = useMutation({
    mutationFn: updateFulfillment,
    onSuccess: (_, variables) => {
      setActionTarget(null);
      setOpenMenuOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });

      const successMessages: Record<FulfillmentAction, string> = {
        confirm: "Pesanan berhasil dikonfirmasi ke tahap diproses.",
        ship: "Resi pengiriman berhasil disimpan.",
        cancel: "Pesanan berhasil dibatalkan.",
      };

      setNotice({
        tone: "success",
        message: successMessages[variables.action],
      });
    },
    onError: (error) => {
      setNotice({
        tone: "error",
        message: getError(error, "Pembaruan pesanan gagal disimpan."),
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (_, variables) => {
      setOpenMenuOrderId(null);
      setOpenStatusMenuOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      setNotice({
        tone: "success",
        message: `Status pesanan berhasil diubah ke ${adminStatusOptions.find((option) => option.value === variables.status)?.label ?? "status baru"}.`,
      });
    },
    onError: (error) => {
      setNotice({
        tone: "error",
        message: getError(error, "Status pesanan gagal diperbarui."),
      });
    },
  });

  const openActionModal = (kind: FulfillmentAction, order: SalesOrder) => {
    setActionTarget({ kind, order });
    setOpenMenuOrderId(null);
    setOpenStatusMenuOrderId(null);
    setFulfillmentForm({
      tracking_number: order.tracking_number ?? "",
      tracking_url: order.tracking_url ?? "",
      shipping_courier: order.shipping_courier ?? "",
      shipping_service: order.shipping_service ?? "",
      note: "",
    });
  };

  const subtotal = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const selected = catalogMap.get(item.catalog_id);
        if (!selected) return sum;
        return sum + selected.unit_price * item.quantity;
      }, 0),
    [catalogMap, form.items]
  );

  const grandTotal = Math.max(0, subtotal + form.shipping_cost - form.discount_amount);
  const listStart = pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1;
  const listEnd = pagination.total === 0 ? 0 : Math.min(pagination.total, listStart + Math.max(orders.length - 1, 0));
  const pageNumbers = useMemo(() => {
    const lastPage = Math.max(1, pagination.last_page);
    if (lastPage <= 3) {
      return Array.from({ length: lastPage }, (_, index) => index + 1);
    }

    let startPage = Math.max(1, pagination.current_page - 1);
    const endPage = Math.min(lastPage, startPage + 2);
    startPage = Math.max(1, endPage - 2);

    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [pagination.current_page, pagination.last_page]);

  const sortedOrders = useMemo(() => {
    const nextOrders = [...orders];

    nextOrders.sort((left, right) => {
      if (sortBy === "oldest") {
        return getOrderTimestamp(left.created_at) - getOrderTimestamp(right.created_at);
      }

      if (sortBy === "amount_desc") {
        return right.total_amount - left.total_amount;
      }

      if (sortBy === "amount_asc") {
        return left.total_amount - right.total_amount;
      }

      return getOrderTimestamp(right.created_at) - getOrderTimestamp(left.created_at);
    });

    return nextOrders;
  }, [orders, sortBy]);

  const summaryMetrics = useMemo(() => {
    const counters = {
      pending: 0,
      paid: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    };

    sortedOrders.forEach((order) => {
      const paymentStatus = String(order.payment_status ?? "").trim().toLowerCase();

      if (order.status === "dibatalkan" || FAILED_PAYMENT_STATUSES.has(paymentStatus)) {
        counters.cancelled += 1;
        return;
      }

      if (order.status === "selesai") {
        counters.delivered += 1;
        return;
      }

      if (order.status === "terkirim") {
        counters.delivered += 1;
        return;
      }

      if (order.status === "dikirim") {
        counters.shipping += 1;
        return;
      }

      if (order.status === "diproses") {
        counters.processing += 1;
        return;
      }

      if (SUCCESS_PAYMENT_STATUSES.has(paymentStatus)) {
        counters.paid += 1;
        return;
      }

      counters.pending += 1;
    });

    return [
      { label: "Menunggu pembayaran", value: counters.pending, accent: "bg-amber-500" },
      { label: "Sudah dibayar", value: counters.paid, accent: "bg-blue-500" },
      { label: "Sedang diproses", value: counters.processing, accent: "bg-sky-500" },
      { label: "Sedang dikirim", value: counters.shipping, accent: "bg-indigo-500" },
      { label: "Pesanan terkirim", value: counters.delivered, accent: "bg-emerald-500" },
      { label: "Dibatalkan / gagal", value: counters.cancelled, accent: "bg-rose-500" },
    ];
  }, [sortedOrders]);

  const handleExport = () => {
    const headers = ["Order ID", "Tanggal", "Pelanggan", "Produk", "Pengiriman", "Total", "Status"];
    const rows = sortedOrders.map((order) => [
      order.order_number,
      `${formatOrderDate(order.created_at)} ${formatOrderTime(order.created_at)}`,
      order.customer_name,
      getOrderPrimaryProduct(order),
      getShippingMethodLabel(order),
      String(order.total_amount),
      resolveBadgeLabel(order),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-orders-${status}-${pagination.current_page}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setNotice({
      tone: "success",
      message: "Data pesanan berhasil diexport.",
    });
  };

  const handleTrackOrder = (order: SalesOrder) => {
    const trackingUrl = resolveTrackingPageUrl(order);
    const trackingNumber = String(order.tracking_number ?? "").trim();

    if (!trackingUrl) {
      setNotice({
        tone: "error",
        message: "Nomor resi belum tersedia, jadi halaman tracking belum bisa dibuka.",
      });
      return;
    }

    window.open(trackingUrl, "_blank", "noopener,noreferrer");
    setOpenMenuOrderId(null);

    if (String(order.tracking_url ?? "").trim() !== "") {
      return;
    }

    setNotice({
      tone: "success",
      message: trackingNumber
        ? `Halaman tracking ${String(order.shipping_courier ?? "kurir").toUpperCase()} dibuka. Gunakan resi ${trackingNumber} untuk melacak pesanan.`
        : "Halaman tracking kurir dibuka.",
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-slate-500">Admin / Pemesanan</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Manage Orders</h1>
          <p className="mt-3 text-base leading-8 text-slate-500">
            Kelola pemenuhan pesanan, lacak status transaksi, dan pantau progres pengiriman dari satu dashboard admin.
          </p>
        </div>

        <div className="flex w-full max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search order ID / product name / customer..."
              className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            {ordersQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : null}
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FileDown className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenCreate(true);
                setFormError("");
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Buat Pesanan Baru
            </button>
          </div>
        </div>
      </section>

      <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
        <Megaphone className="h-4 w-4" />
        <span>Pantau metrik fulfillment terbaru langsung dari dashboard pemesanan ini.</span>
      </div>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Action Needed</h2>
            <p className="text-sm text-slate-500">Ringkasan status pesanan pada halaman aktif saat ini.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {summaryMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
              <div className={`space-y-3 ${metric.value === 0 ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${metric.accent}`} />
                  <p className="text-sm leading-6 text-slate-500">{metric.label}</p>
                </div>
                <p className="text-4xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <div className="flex min-w-max items-end gap-7">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setStatus(tab.value);
                      setPage(1);
                    }}
                    className={`border-b-2 pb-3 text-sm font-semibold transition ${
                      status === tab.value
                        ? "border-emerald-500 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm font-medium text-slate-500">
              Ditemukan <span className="font-semibold text-slate-900">{pagination.total}</span> pesanan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setSortBy("latest");
                setPage(1);
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ListFilter className="h-4 w-4" />
              Reset Filter
            </button>

            <label className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              <ArrowUpDown className="h-4 w-4" />
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="bg-transparent pr-1 text-sm font-semibold text-slate-700 outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {notice ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <div className={`hidden gap-6 border-b border-slate-200 bg-slate-50 px-6 py-4 lg:grid ${orderGridClass}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Order ID</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Buyer</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Items</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Shipping Method</p>
          <p className="text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Total Price</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Status</p>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Aksi</p>
        </div>

        <div className="space-y-4 p-5">
          {ordersQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`sales-loading-${index}`} className="h-52 animate-pulse rounded-[28px] border border-slate-200 bg-white shadow-sm" />
            ))
          ) : sortedOrders.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <PackageSearch className="h-5 w-5" />
                </span>
                <p className="text-base font-medium text-slate-700">Tidak ada pesanan ditemukan di kategori ini.</p>
                <p className="text-sm text-slate-500">Coba ubah filter tab atau kata kunci pencarian Anda.</p>
              </div>
            </div>
          ) : (
            sortedOrders.map((order) => {
              const primaryProduct = getOrderPrimaryProduct(order);
              const badgeClassName = resolveBadgeClassName(order);
              const badgeAccentClass = resolveBadgeAccent(order);
              const badgeLabel = resolveBadgeLabel(order);
              const menuStatusValue = resolveMenuStatusValue(order);
              const progressStep = resolveProgressStep(order);
              const detailHref = `/admin/pemesanan/${encodeURIComponent(order.id)}`;
              const operationalAction = canConfirmOrder(order) ? "confirm" : canShipOrder(order) ? "ship" : null;
              const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const itemMeta =
                order.items.length > 1
                  ? `${order.items.length} produk / ${totalUnits} unit`
                  : `${Math.max(totalUnits, 1)} item`;

              return (
                <article
                  key={order.id}
                  id={`order-${order.id}`}
                  className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-[0_18px_38px_rgba(37,99,235,0.08)]"
                >
                  <div className={`grid grid-cols-1 gap-5 lg:items-center lg:gap-5 ${orderGridClass}`}>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {formatOrderDate(order.created_at).toUpperCase()}
                      </p>
                      <Link
                        href={detailHref}
                        className="block break-words text-[1.32rem] font-semibold leading-8 tracking-[-0.02em] text-slate-900 transition hover:text-blue-600"
                      >
                        {order.order_number}
                      </Link>
                      <p className="text-sm text-slate-500">{formatOrderTime(order.created_at)}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="truncate text-[1.05rem] font-semibold leading-7 tracking-[-0.01em] text-slate-900">
                        {order.customer_name}
                      </p>
                      <p className="truncate text-sm leading-6 text-slate-500">{order.customer_phone || order.customer_email || "-"}</p>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-[0.98rem] font-semibold leading-6 text-slate-900">{primaryProduct}</p>
                      <p className="text-sm leading-6 text-slate-500">{itemMeta}</p>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold leading-6 text-slate-900">{getShippingMethodLabel(order)}</p>
                      <p className="truncate text-xs leading-5 text-slate-500">{getShippingMethodMeta(order)}</p>
                    </div>

                    <div className="flex flex-col justify-center space-y-1 lg:items-end lg:pr-3 lg:text-right">
                      <p className="text-[1.72rem] font-semibold tracking-[-0.03em] text-slate-900">{idr(order.total_amount)}</p>
                      <p className="text-sm text-slate-500">{order.items.length} item checkout</p>
                    </div>

                    <div className="relative lg:justify-self-center" data-admin-status-menu="true">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuOrderId(null);
                          setOpenStatusMenuOrderId((previous) => (previous === order.id ? null : order.id));
                        }}
                        disabled={statusMutation.isPending}
                        className="inline-flex min-h-10 w-full min-w-[148px] items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-haspopup="menu"
                        aria-expanded={openStatusMenuOrderId === order.id}
                        aria-label={`Ubah status ${order.order_number}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${badgeAccentClass}`} />
                          <span className={`truncate text-[11px] font-semibold uppercase tracking-[0.22em] ${badgeClassName}`}>
                            {adminStatusOptions.find((option) => option.value === menuStatusValue)?.label ?? badgeLabel}
                          </span>
                        </span>
                        <span className="shrink-0">
                          {statusMutation.isPending && openStatusMenuOrderId === order.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </span>
                      </button>

                      {openStatusMenuOrderId === order.id ? (
                        <div
                          className="absolute left-0 top-12 z-20 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                          role="menu"
                          aria-label={`Status ${order.order_number}`}
                        >
                          {adminStatusOptions.map((option) => {
                            const optionTone =
                              option.value === "dibatalkan"
                                ? "text-rose-700"
                                : option.value === "selesai"
                                  ? "text-emerald-700"
                                  : option.value === "pending"
                                    ? "text-amber-700"
                                    : "text-blue-700";

                            const isActive = menuStatusValue === option.value;

                            return (
                              <button
                                key={`${order.id}:${option.value}`}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isActive}
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  void statusMutation.mutateAsync({
                                    orderId: order.id,
                                    status: option.value,
                                  })
                                }
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isActive ? "bg-slate-50" : ""
                                }`}
                              >
                                <span className={`font-medium ${optionTone}`}>{option.label}</span>
                                {isActive ? <Check className="h-4 w-4 text-slate-500" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div className="relative lg:justify-self-center" data-admin-order-menu="true">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenStatusMenuOrderId(null);
                          setOpenMenuOrderId((previous) => (previous === order.id ? null : order.id));
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`Buka aksi ${order.order_number}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenuOrderId === order.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenuOrderId === order.id ? (
                        <div
                          className="absolute right-0 top-12 z-20 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                          role="menu"
                          aria-label={`Aksi ${order.order_number}`}
                        >
                          <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Utama
                          </p>
                          <Link
                            href={detailHref}
                            role="menuitem"
                            onClick={() => setOpenMenuOrderId(null)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4 text-slate-500" />
                            Detail Pesanan
                          </Link>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              printInvoice(order);
                              setOpenMenuOrderId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <Download className="h-4 w-4 text-slate-500" />
                            Print Invoice
                          </button>

                          {operationalAction ? (
                            <>
                              <div className="my-2 border-t border-slate-100" />
                              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Operasional
                              </p>
                              {canTrackOrder(order) ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleTrackOrder(order)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                  <PackageSearch className="h-4 w-4 text-slate-500" />
                                  Lacak Pesanan
                                </button>
                              ) : null}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openActionModal(operationalAction, order)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                {operationalAction === "confirm" ? (
                                  <Check className="h-4 w-4 text-slate-500" />
                                ) : (
                                  <Truck className="h-4 w-4 text-slate-500" />
                                )}
                                {operationalAction === "confirm" ? "Konfirmasi Pesanan" : "Input Resi"}
                              </button>
                            </>
                          ) : null}

                          {canCancelOrder(order) || canDeleteOrder(order) ? (
                            <>
                              <div className="my-2 border-t border-slate-100" />
                              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-400">
                                Danger Zone
                              </p>
                              {canCancelOrder(order) ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => openActionModal("cancel", order)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                  Batalkan Pesanan
                                </button>
                              ) : null}
                              {canDeleteOrder(order) ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setDeleteTarget(order);
                                    setOpenMenuOrderId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Hapus
                                </button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[760px] grid-cols-6 gap-3">
                        {progressStages.map((stage, index) => {
                          const stepNumber = index + 1;
                          const awaitingPayment = progressStep === 1 && !isPaidOrder(order);
                          const current = awaitingPayment && stepNumber === 1;
                          const completed = !current && progressStep >= stepNumber;

                          return (
                            <div key={`${order.id}:${stage}`} className="flex flex-1 flex-col items-center gap-1.5">
                              <div className="relative h-7 w-full">
                                <div
                                  className={`absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full ${
                                    completed ? "bg-emerald-500" : current ? "bg-amber-300" : "bg-slate-200"
                                  }`}
                                />
                                <span
                                  className={`absolute left-1/2 top-1/2 inline-flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border ${
                                    completed
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : current
                                        ? "border-amber-400 bg-amber-400 text-white"
                                        : "border-slate-200 bg-slate-100 text-slate-400"
                                  }`}
                                >
                                  {completed ? (
                                    <Check className="h-4 w-4" />
                                  ) : current ? (
                                    <span className="h-2 w-2 rounded-full bg-white" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </span>
                              </div>
                              <p
                                className={`text-center text-[10px] font-medium ${
                                  completed ? "text-slate-700" : current ? "text-slate-800" : "text-slate-400"
                                }`}
                              >
                                {stage}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Menampilkan <span className="font-semibold text-slate-900">{listStart}</span> -{" "}
            <span className="font-semibold text-slate-900">{listEnd}</span> dari{" "}
            <span className="font-semibold text-slate-900">{pagination.total}</span> pesanan
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || ordersQuery.isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                  pagination.current_page === pageNumber
                    ? "bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              disabled={page >= pagination.last_page || ordersQuery.isFetching}
              onClick={() => setPage((prev) => Math.min(pagination.last_page, prev + 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {openCreate ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 p-4">
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Buat Sales Order</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Status <strong>Diproses</strong> akan otomatis stock out dari warehouse yang dipilih.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  value={form.customer_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, customer_name: event.target.value }))}
                  placeholder="Nama Customer"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
                <input
                  value={form.customer_phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, customer_phone: event.target.value }))}
                  placeholder="No. Telepon"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
                <input
                  value={form.customer_email}
                  onChange={(event) => setForm((prev) => ({ ...prev, customer_email: event.target.value }))}
                  placeholder="Email"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as SalesOrderStatus }))}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
                >
                  <option value="dibayar">Menunggu Pembayaran</option>
                  <option value="diproses">Diproses</option>
                  <option value="dikirim">Dikirim</option>
                  <option value="terkirim">Pesanan Terkirim</option>
                  <option value="selesai">Selesai</option>
                  <option value="dibatalkan">Dibatalkan</option>
                </select>
              </div>

              <textarea
                value={form.customer_address}
                onChange={(event) => setForm((prev) => ({ ...prev, customer_address: event.target.value }))}
                rows={2}
                placeholder="Alamat Customer"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-semibold text-slate-700">Item Pesanan</p>
                  <label className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-slate-500">
                    <Search className="h-4 w-4 text-blue-500" />
                    <input
                      value={catalogSearch}
                      onChange={(event) => setCatalogSearch(event.target.value)}
                      placeholder="Cari produk/SKU..."
                      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    {catalogQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : null}
                  </label>
                </div>

                <div className="space-y-2">
                  {form.items.map((item) => {
                    const selected = catalogMap.get(item.catalog_id);
                    const warehouseStock = selected?.warehouse_stock.find((entry) => entry.warehouse === item.warehouse)?.stock ?? 0;
                    const lineTotal = (selected?.unit_price ?? 0) * item.quantity;

                    return (
                      <div key={item.key} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.8fr)_220px_120px_130px_130px]">
                          <select
                            value={item.catalog_id}
                            onChange={(event) => {
                              const next = catalogMap.get(event.target.value);
                              setForm((prev) => ({
                                ...prev,
                                items: prev.items.map((entry) =>
                                  entry.key === item.key
                                    ? {
                                        ...entry,
                                        catalog_id: event.target.value,
                                        warehouse: next?.warehouse_stock[0]?.warehouse ?? "",
                                      }
                                    : entry
                                ),
                              }));
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
                          >
                            <option value="">Pilih Produk / SKU</option>
                            {(catalogQuery.data ?? []).map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.product_name} | {entry.variant_name} | {entry.variant_sku}
                              </option>
                            ))}
                          </select>

                          <select
                            value={item.warehouse}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                items: prev.items.map((entry) =>
                                  entry.key === item.key ? { ...entry, warehouse: event.target.value } : entry
                                ),
                              }))
                            }
                            disabled={!selected}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 disabled:opacity-60"
                          >
                            <option value="">Pilih Warehouse</option>
                            {selected?.warehouse_stock.map((entry) => (
                              <option key={`${item.key}:${entry.warehouse}`} value={entry.warehouse}>
                                {entry.warehouse} (Stock: {entry.stock})
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min={1}
                            max={warehouseStock > 0 ? warehouseStock : undefined}
                            value={item.quantity}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                items: prev.items.map((entry) =>
                                  entry.key === item.key ? { ...entry, quantity: Math.max(1, Number(event.target.value) || 1) } : entry
                                ),
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
                          />

                          <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                            <p className="text-[11px]">Landed</p>
                            <p className="font-semibold">{idr(selected?.landed_cost ?? 0)}</p>
                          </div>

                          <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                            <p className="text-[11px]">Line Total</p>
                            <p className="font-semibold">{idr(lineTotal)}</p>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <p>
                            Available stock: <span className="font-semibold text-slate-700">{warehouseStock}</span>
                          </p>
                          {form.items.length > 1 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  items: prev.items.filter((entry) => entry.key !== item.key),
                                }))
                              }
                              className="text-rose-600 hover:text-rose-700"
                            >
                              Hapus item
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      items: [...prev.items, emptyItem()],
                    }))
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Item
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  type="number"
                  min={0}
                  value={form.shipping_cost}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, shipping_cost: Math.max(0, Number(event.target.value) || 0) }))
                  }
                  placeholder="Shipping Cost"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
                <input
                  type="number"
                  min={0}
                  value={form.discount_amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, discount_amount: Math.max(0, Number(event.target.value) || 0) }))
                  }
                  placeholder="Discount Amount"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
                <div className="rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
                  <p className="text-[11px]">Grand Total</p>
                  <p className="text-base font-semibold">{idr(grandTotal)}</p>
                </div>
              </div>

              <textarea
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={2}
                placeholder="Catatan pesanan"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
              />

              {formError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={async () => {
                  setFormError("");

                  if (form.customer_name.trim() === "") {
                    setFormError("Nama customer wajib diisi.");
                    return;
                  }

                  const invalidItem = form.items.find((item) => {
                    const selected = catalogMap.get(item.catalog_id);
                    if (!selected) return true;
                    if (!item.warehouse) return true;
                    const available = selected.warehouse_stock.find((entry) => entry.warehouse === item.warehouse)?.stock ?? 0;
                    return item.quantity < 1 || item.quantity > available;
                  });

                  if (invalidItem) {
                    setFormError("Pastikan item, warehouse, dan quantity sudah valid sesuai stok.");
                    return;
                  }

                  await createMutation.mutateAsync({
                    customer_name: form.customer_name.trim(),
                    customer_phone: form.customer_phone.trim() || undefined,
                    customer_email: form.customer_email.trim() || undefined,
                    customer_address: form.customer_address.trim() || undefined,
                    status: form.status,
                    shipping_cost: form.shipping_cost,
                    discount_amount: form.discount_amount,
                    notes: form.notes.trim() || undefined,
                    items: form.items.map((item) => {
                      const selected = catalogMap.get(item.catalog_id)!;
                      return {
                        product_id: selected.product_id,
                        variant_sku: selected.variant_sku,
                        warehouse: item.warehouse,
                        quantity: item.quantity,
                        unit_price: selected.unit_price,
                      };
                    }),
                  });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Simpan Pesanan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {actionTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                  actionTarget.kind === "cancel" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                }`}
              >
                {actionTarget.kind === "ship" ? (
                  <Truck className="h-5 w-5" />
                ) : actionTarget.kind === "confirm" ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  {actionTarget.kind === "ship"
                    ? "Input Resi"
                    : actionTarget.kind === "confirm"
                      ? "Konfirmasi Pesanan"
                      : "Batalkan Pesanan"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {actionTarget.kind === "ship"
                    ? <>Lengkapi resi untuk <span className="font-semibold text-slate-700">{actionTarget.order.order_number}</span> agar status pengiriman masuk ke tahap <span className="font-semibold text-slate-700">Dikirim</span>.</>
                    : actionTarget.kind === "confirm"
                      ? <>Pesanan <span className="font-semibold text-slate-700">{actionTarget.order.order_number}</span> akan dipindahkan ke tahap <span className="font-semibold text-slate-700">Diproses</span>.</>
                      : <>Pesanan <span className="font-semibold text-slate-700">{actionTarget.order.order_number}</span> akan dibatalkan. Tindakan ini hanya tersedia untuk pesanan yang belum dibayar.</>}
                </p>
              </div>
            </div>

            {actionTarget.kind === "ship" ? (
              <div className="mt-6 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={fulfillmentForm.shipping_courier}
                    onChange={(event) =>
                      setFulfillmentForm((prev) => ({ ...prev, shipping_courier: event.target.value }))
                    }
                    placeholder="Kurir, contoh: JNE"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                  />
                  <input
                    value={fulfillmentForm.shipping_service}
                    onChange={(event) =>
                      setFulfillmentForm((prev) => ({ ...prev, shipping_service: event.target.value }))
                    }
                    placeholder="Layanan, contoh: CTC"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                  />
                </div>

                <input
                  value={fulfillmentForm.tracking_number}
                  onChange={(event) =>
                    setFulfillmentForm((prev) => ({ ...prev, tracking_number: event.target.value }))
                  }
                  placeholder="Nomor resi"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                />

                <input
                  value={fulfillmentForm.tracking_url}
                  onChange={(event) =>
                    setFulfillmentForm((prev) => ({ ...prev, tracking_url: event.target.value }))
                  }
                  placeholder="Tracking URL (opsional)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                />

                <textarea
                  rows={3}
                  value={fulfillmentForm.note}
                  onChange={(event) => setFulfillmentForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Catatan admin (opsional)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                />
              </div>
            ) : (
              <div
                className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                  actionTarget.kind === "cancel"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {actionTarget.kind === "confirm"
                  ? "Gunakan aksi ini setelah pembayaran Midtrans sudah settled agar order masuk ke workflow fulfillment."
                  : "Pembatalan tidak menghapus data pesanan. Gunakan hapus hanya untuk order yang benar-benar perlu dibersihkan dari daftar."}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                disabled={fulfillmentMutation.isPending}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={fulfillmentMutation.isPending}
                onClick={async () => {
                  if (actionTarget.kind === "ship" && fulfillmentForm.tracking_number.trim() === "") {
                    setNotice({
                      tone: "error",
                      message: "Nomor resi wajib diisi sebelum pengiriman disimpan.",
                    });
                    return;
                  }

                  await fulfillmentMutation.mutateAsync({
                    orderId: actionTarget.order.id,
                    action: actionTarget.kind,
                    tracking_number:
                      actionTarget.kind === "ship" ? fulfillmentForm.tracking_number.trim() : undefined,
                    tracking_url: actionTarget.kind === "ship" ? fulfillmentForm.tracking_url.trim() : undefined,
                    shipping_courier:
                      actionTarget.kind === "ship" ? fulfillmentForm.shipping_courier.trim() : undefined,
                    shipping_service:
                      actionTarget.kind === "ship" ? fulfillmentForm.shipping_service.trim() : undefined,
                    note: actionTarget.kind === "ship" ? fulfillmentForm.note.trim() : undefined,
                  });
                }}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  actionTarget.kind === "cancel" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {fulfillmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {actionTarget.kind === "ship"
                  ? "Simpan Resi"
                  : actionTarget.kind === "confirm"
                    ? "Konfirmasi Pesanan"
                    : "Batalkan Pesanan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Hapus Pesanan</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Pesanan <span className="font-semibold text-slate-700">{deleteTarget.order_number}</span> akan dihapus permanen.
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Hapus hanya tersedia untuk pesanan yang belum diproses atau belum berhasil dibayar.
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void deleteMutation.mutateAsync(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Hapus Pesanan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

