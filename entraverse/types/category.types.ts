export type ValueType = "percent" | "amount";

export type FeeComponent = {
  id?: string;
  label: string;
  value: number | string;
  valueType: ValueType;
  min?: number;
  max?: number;
  notes?: string | null;
};

export type FeeChannel = {
  components: FeeComponent[];
  percent?: number | string;
  rate?: number | string;
  percentage?: number | string;
  total_percent?: number | string;
  totalPercent?: number | string;
  summary?: number | string | Record<string, unknown> | null;
};

export type CategoryFees = {
  marketplace: FeeChannel;
  shopee: FeeChannel;
  entraverse: FeeChannel;
  tokopedia?: FeeChannel;
  tokopedia_tiktok?: FeeChannel;
};

export type CategoryActivity = {
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Category = {
  id: string;
  name: string;
  icon?: string | null;
  icon_url?: string | null;
  icon_svg?: string | null;
  fees: CategoryFees;
  program_garansi?: string | Record<string, unknown> | null;
  margin_percent: number;
  min_margin: number;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  activity?: CategoryActivity;
};

export type SortOrder = "asc" | "desc";

export type CategorySortBy =
  | "name"
  | "min_margin"
  | "created_at"
  | "updated_at";

export type CategoryListParams = {
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: CategorySortBy;
  sortOrder?: SortOrder;
  minMargin?: number;
  maxMargin?: number;
  withTrashed?: boolean;
  onlyTrashed?: boolean;
};

export type PaginationMeta = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
};

export type CategoryListResult = {
  data: Category[];
  pagination: PaginationMeta;
  source: "server" | "client";
};

export type CategoryStats = {
  total: number;
  active: number;
  deleted: number;
  with_icon: number;
  avg_margin: number;
  max_margin: number;
  min_margin: number;
};

export type CategoryFormValues = {
  name: string;
  min_margin: number;
  program_garansi: string;
  fees: CategoryFees;
  iconFile: File | null;
  iconSvg: string;
  removeIcon: boolean;
};

export type CategoryMutationInput = {
  name: string;
  margin_percent?: number;
  min_margin: number;
  program_garansi?: string;
  fees: CategoryFees;
  icon?: File | null;
  icon_svg?: string;
  remove_icon?: boolean;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
  pagination?: PaginationMeta;
  errors?: Record<string, string[]>;
};

export type CheckNamePayload = {
  name: string;
  exclude_id?: string;
};

export type CheckNameResult = {
  exists: boolean;
  message: string;
};

export type BulkDeletePayload = {
  ids: string[];
};
