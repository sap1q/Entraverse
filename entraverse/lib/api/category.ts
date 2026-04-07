import api, { apiUpload } from "@/lib/axios";
import type {
  ApiEnvelope,
  BulkDeletePayload,
  Category,
  CategoryFees,
  CategoryListParams,
  CategoryListResult,
  CategoryMutationInput,
  CategorySortBy,
  CategoryStats,
  CheckNamePayload,
  CheckNameResult,
  FeeChannel,
  PaginationMeta,
  SortOrder,
} from "@/types/category.types";

type AnyRecord = Record<string, unknown>;

type RawCategory = AnyRecord & {
  id?: string | number;
  name?: string;
  icon?: string | null;
  icon_url?: string | null;
  icon_svg?: string | null;
  fees?: unknown;
  margin_percent?: number | string;
  marginPercent?: number | string;
  min_margin?: number | string;
  minMargin?: number | string;
  program_garansi?: unknown;
  deleted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
  from: null,
  to: null,
};

const DECIMAL_REGEX = /[^\d.,-]/g;

const emptyChannel = (): FeeChannel => ({ components: [] });

const emptyFees = (): CategoryFees => ({
  marketplace: emptyChannel(),
  shopee: emptyChannel(),
  entraverse: emptyChannel(),
  tokopedia: emptyChannel(),
  tokopedia_tiktok: emptyChannel(),
});

const parseNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(DECIMAL_REGEX, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseRupiahNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value !== "string") return 0;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const isRawSvg = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.startsWith("<svg") || (trimmed.startsWith("<?xml") && trimmed.includes("<svg"));
};

const isAmountValueType = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "amount" || normalized === "rp" || normalized === "rupiah";
};

const hasComponents = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const components = (value as { components?: unknown }).components;
  if (!Array.isArray(components)) return false;

  return components.some((component) => {
    if (!component || typeof component !== "object") return false;
    const row = component as Record<string, unknown>;
    const label = String(row.label ?? "").trim();
    const valueType = isAmountValueType(row.valueType) ? "amount" : "percent";
    const numericValue =
      valueType === "amount" ? parseRupiahNumber(row.value) : parseNumber(row.value);
    const min = parseRupiahNumber(row.min);
    const max = parseRupiahNumber(row.max);

    return label !== "" || numericValue > 0 || min > 0 || max > 0;
  });
};

const pickPreferredChannel = (...candidates: unknown[]): unknown => {
  const populated = candidates.find((candidate) => hasComponents(candidate));
  if (populated) return populated;
  return candidates.find((candidate) => candidate && typeof candidate === "object") ?? null;
};

const normalizeChannel = (value: unknown): FeeChannel => {
  if (!value || typeof value !== "object") return emptyChannel();
  const row = value as Record<string, unknown>;
  const components = row.components;

  return {
    components: (Array.isArray(components) ? components : []).map((component, index) => {
      const row = (component ?? {}) as Record<string, unknown>;
      const valueType = isAmountValueType(row.valueType) ? "amount" : "percent";
      const normalizedValue =
        valueType === "amount" ? parseRupiahNumber(row.value) : parseNumber(row.value);

      return {
        id: String(row.id ?? `${Date.now()}-${index}`),
        label: String(row.label ?? ""),
        value: String(normalizedValue),
        valueType,
        min: parseRupiahNumber(row.min),
        max: parseRupiahNumber(row.max),
        notes: typeof row.notes === "string" ? row.notes : null,
      };
    }),
    percent: typeof row.percent === "number" || typeof row.percent === "string" ? row.percent : undefined,
    rate: typeof row.rate === "number" || typeof row.rate === "string" ? row.rate : undefined,
    percentage:
      typeof row.percentage === "number" || typeof row.percentage === "string"
        ? row.percentage
        : undefined,
    total_percent:
      typeof row.total_percent === "number" || typeof row.total_percent === "string"
        ? row.total_percent
        : undefined,
    totalPercent:
      typeof row.totalPercent === "number" || typeof row.totalPercent === "string"
        ? row.totalPercent
        : undefined,
    summary:
      typeof row.summary === "number" ||
      typeof row.summary === "string" ||
      (row.summary !== null && typeof row.summary === "object")
        ? (row.summary as number | string | Record<string, unknown>)
        : null,
  };
};

const normalizeFees = (value: unknown): CategoryFees => {
  if (!value || typeof value !== "object") return emptyFees();
  const payload = value as Record<string, unknown>;
  const marketplaceSource = pickPreferredChannel(
    payload.marketplace,
    payload.tokopedia,
    payload.tokopedia_tiktok
  );
  const tokopediaSource = pickPreferredChannel(
    payload.tokopedia,
    payload.tokopedia_tiktok,
    payload.marketplace
  );
  const tokopediaTiktokSource = pickPreferredChannel(
    payload.tokopedia_tiktok,
    payload.tokopedia,
    payload.marketplace
  );

  return {
    marketplace: normalizeChannel(marketplaceSource),
    shopee: normalizeChannel(payload.shopee),
    entraverse: normalizeChannel(payload.entraverse),
    tokopedia: normalizeChannel(tokopediaSource),
    tokopedia_tiktok: normalizeChannel(tokopediaTiktokSource),
  };
};

const normalizeCategory = (raw: RawCategory): Category => {
  const marginPercent = parseNumber(raw.margin_percent ?? raw.marginPercent ?? raw.min_margin ?? raw.minMargin);
  const iconValue = (raw.icon as string | null | undefined) ?? null;
  const iconUrlValue =
    raw.icon_url ??
    (typeof iconValue === "string" && iconValue.trim() !== "" && !isRawSvg(iconValue) ? iconValue : null);
  const iconSvgValue =
    raw.icon_svg ??
    (typeof iconValue === "string" && isRawSvg(iconValue) ? iconValue : null);

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    name: String(raw.name ?? "Tanpa nama"),
    icon: iconValue,
    icon_url: iconUrlValue,
    icon_svg: iconSvgValue,
    fees: normalizeFees(raw.fees),
    program_garansi:
      typeof raw.program_garansi === "string" ||
      (raw.program_garansi !== null && typeof raw.program_garansi === "object")
        ? (raw.program_garansi as string | Record<string, unknown>)
        : null,
    margin_percent: marginPercent,
    min_margin: marginPercent,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    deleted_at: raw.deleted_at ?? null,
    activity: {
      createdBy:
        typeof raw.created_by_name === "string"
          ? raw.created_by_name
          : typeof raw.created_by === "string"
          ? raw.created_by
          : null,
      updatedBy:
        typeof raw.updated_by_name === "string"
          ? raw.updated_by_name
          : typeof raw.updated_by === "string"
          ? raw.updated_by
          : null,
      createdAt: raw.created_at ?? null,
      updatedAt: raw.updated_at ?? null,
    },
  };
};

const sortCategoryRows = (data: Category[], sortBy: CategorySortBy, sortOrder: SortOrder): Category[] => {
  const sign = sortOrder === "asc" ? 1 : -1;
  return [...data].sort((a, b) => {
    if (sortBy === "name") return sign * a.name.localeCompare(b.name, "id");
    if (sortBy === "min_margin") return sign * (a.min_margin - b.min_margin);

    const aDate = new Date(a[sortBy] ?? 0).getTime();
    const bDate = new Date(b[sortBy] ?? 0).getTime();
    return sign * (aDate - bDate);
  });
};

const buildPagination = (total: number, page: number, perPage: number): PaginationMeta => {
  const safePerPage = Math.max(1, perPage);
  const lastPage = Math.max(1, Math.ceil(total / safePerPage));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const from = total === 0 ? null : (safePage - 1) * safePerPage + 1;
  const to = total === 0 ? null : Math.min(safePage * safePerPage, total);

  return {
    total,
    per_page: safePerPage,
    current_page: safePage,
    last_page: lastPage,
    from,
    to,
  };
};

const toFormData = (payload: CategoryMutationInput): FormData => {
  const formData = new FormData();
  formData.append("name", payload.name);
  const marginPercent =
    typeof payload.margin_percent === "number" && Number.isFinite(payload.margin_percent)
      ? payload.margin_percent
      : payload.min_margin;
  formData.append("margin_percent", String(marginPercent));
  formData.append("min_margin", String(marginPercent));
  formData.append("fees", JSON.stringify(payload.fees));

  if (payload.program_garansi?.trim()) {
    formData.append("program_garansi", payload.program_garansi);
  }
  if (payload.icon) {
    formData.append("icon", payload.icon);
  }
  if (payload.icon_svg?.trim()) {
    formData.append("icon_svg", payload.icon_svg);
  }
  if (payload.remove_icon) {
    formData.append("remove_icon", "1");
  }

  return formData;
};

const createTimeoutSignal = (timeoutMs: number): AbortSignal | undefined => {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
};

const withTimeoutRetry = async <T>(runner: () => Promise<T>, maxRetries = 2): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await runner();
    } catch (error) {
      const isAxiosTimeout =
        typeof error === "object" &&
        error !== null &&
        ("code" in error ? (error as { code?: string }).code === "ECONNABORTED" : false);
      if (!isAxiosTimeout || attempt >= maxRetries) throw error;

      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      attempt += 1;
    }
  }
};

const extractList = (payload: unknown): RawCategory[] => {
  if (Array.isArray(payload)) return payload as RawCategory[];
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) return data as RawCategory[];
  return [];
};

export const categoryApi = {
  async getAll(params: CategoryListParams = {}): Promise<CategoryListResult> {
    const {
      search = "",
      page = 1,
      perPage = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      minMargin,
      maxMargin,
      withTrashed = false,
      onlyTrashed = false,
    } = params;

    try {
      const response = await api.get<ApiEnvelope<Category[]>>("/v1/categories", {
        params: {
          search: search || undefined,
          page,
          per_page: perPage,
          sort_by: sortBy,
          sort_order: sortOrder,
          min_margin: minMargin,
          max_margin: maxMargin,
          with_trashed: withTrashed || undefined,
          only_trashed: onlyTrashed || undefined,
        },
      });

      const data = extractList(response.data).map(normalizeCategory);
      const serverPagination = response.data.pagination;

      if (serverPagination) {
        return {
          data,
          pagination: serverPagination,
          source: "server",
        };
      }

      const filtered = data.filter((item) => {
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
        const matchMin = typeof minMargin === "number" ? item.min_margin >= minMargin : true;
        const matchMax = typeof maxMargin === "number" ? item.min_margin <= maxMargin : true;
        const matchDeleted = onlyTrashed
          ? Boolean(item.deleted_at)
          : withTrashed
          ? true
          : !item.deleted_at;
        return matchSearch && matchMin && matchMax && matchDeleted;
      });

      const sorted = sortCategoryRows(filtered, sortBy, sortOrder);
      const pagination = buildPagination(sorted.length, page, perPage);
      const start = (pagination.current_page - 1) * pagination.per_page;
      const paginated = sorted.slice(start, start + pagination.per_page);

      return {
        data: paginated,
        pagination,
        source: "client",
      };
    } catch {
      return {
        data: [],
        pagination: { ...DEFAULT_PAGINATION, per_page: perPage, current_page: page },
        source: "client",
      };
    }
  },

  async getById(id: string): Promise<Category> {
    const response = await api.get<ApiEnvelope<RawCategory>>(`/v1/categories/${id}`);
    return normalizeCategory(response.data.data);
  },

  async create(payload: CategoryMutationInput): Promise<Category> {
    const response = await withTimeoutRetry(() =>
      apiUpload.post<ApiEnvelope<RawCategory>>(
        "/v1/admin/categories",
        toFormData(payload),
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          signal: createTimeoutSignal(60000),
        }
      )
    );

    return normalizeCategory(response.data.data);
  },

  async update(id: string, payload: CategoryMutationInput): Promise<Category> {
    const response = await withTimeoutRetry(() =>
      apiUpload.post<ApiEnvelope<RawCategory>>(
        `/v1/admin/categories/${id}`,
        (() => {
          const formData = toFormData(payload);
          formData.append("_method", "PUT");
          return formData;
        })(),
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          signal: createTimeoutSignal(60000),
        }
      )
    );

    return normalizeCategory(response.data.data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/v1/admin/categories/${id}`);
  },

  async restore(id: string): Promise<Category> {
    const response = await api.post<ApiEnvelope<RawCategory>>(`/v1/admin/categories/${id}/restore`);
    return normalizeCategory(response.data.data);
  },

  async forceDelete(id: string): Promise<void> {
    await api.delete(`/v1/admin/categories/${id}/force`);
  },

  async bulkDelete(payload: BulkDeletePayload): Promise<void> {
    await api.post("/v1/admin/categories/bulk/delete", payload);
  },

  async getStats(): Promise<CategoryStats> {
    const response = await api.get<ApiEnvelope<CategoryStats>>("/v1/admin/categories/stats/overview");
    return response.data.data;
  },

  async checkName(payload: CheckNamePayload): Promise<CheckNameResult> {
    const response = await api.post<ApiEnvelope<CheckNameResult>>("/v1/admin/categories/check/name", payload);
    return response.data.data;
  },

  async checkAuth() {
    const response = await api.get("/v1/admin/user", { withCredentials: true });
    return response.data;
  },
};

export const formatFeeSummary = (channel?: FeeChannel): string => {
  const components = channel?.components ?? [];
  if (!components.length) return "-";

  return components
    .map((component) => {
      const label = component.label?.trim() || "Komponen";
      const valueType = isAmountValueType(component.valueType) ? "amount" : "percent";
      const numeric = valueType === "amount" ? parseRupiahNumber(component.value) : parseNumber(component.value);
      const value = valueType === "amount" ? `Rp ${numeric.toLocaleString("id-ID")}` : `${numeric}%`;
      const min = parseRupiahNumber(component.min);
      const max = parseRupiahNumber(component.max);

      const limits = [
        min > 0 ? `min Rp ${min.toLocaleString("id-ID")}` : null,
        max > 0 ? `max Rp ${max.toLocaleString("id-ID")}` : null,
      ].filter(Boolean);

      return limits.length > 0 ? `${label}: ${value} | ${limits.join(" | ")}` : `${label}: ${value}`;
    })
    .join(", ");
};
