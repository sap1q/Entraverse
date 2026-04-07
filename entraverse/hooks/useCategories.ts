"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { categoryApi } from "@/lib/api/category";
import { getAuthToken } from "@/lib/axios";
import type {
  Category,
  CategoryFees,
  CategoryFormValues,
  CategoryListParams,
  CategoryListResult,
  CategorySortBy,
  CategoryStats,
  SortOrder,
} from "@/types/category.types";

const emptyFees = (): CategoryFees => ({
  marketplace: { components: [] },
  shopee: { components: [] },
  entraverse: { components: [] },
  tokopedia: { components: [] },
  tokopedia_tiktok: { components: [] },
});

const initialForm = (): CategoryFormValues => ({
  name: "",
  min_margin: 0,
  program_garansi: "",
  fees: emptyFees(),
  iconFile: null,
  iconSvg: "",
  removeIcon: false,
});

const useDebouncedValue = <T,>(value: T, delay = 400): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

const categoryToForm = (category: Category): CategoryFormValues => ({
  name: category.name,
  min_margin: category.margin_percent ?? category.min_margin,
  program_garansi:
    typeof category.program_garansi === "string"
      ? category.program_garansi
      : category.program_garansi
      ? JSON.stringify(category.program_garansi)
      : "",
  fees: category.fees,
  iconFile: null,
  iconSvg:
    category.icon_svg ??
    (typeof category.icon === "string" && category.icon.trim().startsWith("<svg")
      ? category.icon
      : ""),
  removeIcon: false,
});

let categoryOptionsCache: Category[] | null = null;
let categoryOptionsPromise: Promise<Category[]> | null = null;

export function useCategories(initialParams: CategoryListParams = {}) {
  const [params, setParams] = useState<CategoryListParams>({
    page: 1,
    perPage: 10,
    sortBy: "created_at",
    sortOrder: "desc",
    withTrashed: false,
    ...initialParams,
  });
  const [result, setResult] = useState<CategoryListResult>({
    data: [],
    pagination: {
      total: 0,
      current_page: 1,
      per_page: 10,
      last_page: 1,
      from: null,
      to: null,
    },
    source: "client",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const debouncedSearch = useDebouncedValue(params.search ?? "", 350);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await categoryApi.getAll({ ...params, search: debouncedSearch });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat kategori");
      setResult((prev) => ({ ...prev, data: [] }));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, params]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const refresh = useCallback(async () => {
    await fetchList();
  }, [fetchList]);

  const toggleSort = useCallback((field: CategorySortBy) => {
    setParams((prev) => {
      const nextOrder: SortOrder =
        prev.sortBy === field ? (prev.sortOrder === "asc" ? "desc" : "asc") : "asc";

      return {
        ...prev,
        page: 1,
        sortBy: field,
        sortOrder: nextOrder,
      };
    });
  }, []);

  const updateParam = useCallback((patch: Partial<CategoryListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  const optimisticRemove = useCallback((ids: string[]) => {
    setResult((prev) => ({
      ...prev,
      data: prev.data.filter((item) => !ids.includes(item.id)),
    }));
  }, []);

  const deleteOne = useCallback(
    async (id: string) => {
      setIsMutating(true);
      setError(null);
      const previous = result.data;

      optimisticRemove([id]);

      try {
        await categoryApi.delete(id);
        setSelectedIds((prev) => prev.filter((value) => value !== id));
        await fetchList();
        return true;
      } catch (err) {
        setResult((prev) => ({ ...prev, data: previous }));
        setError(err instanceof Error ? err.message : "Gagal menghapus kategori");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchList, optimisticRemove, result.data]
  );

  const bulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return false;

    setIsMutating(true);
    setError(null);
    const previous = result.data;

    optimisticRemove(selectedIds);

    try {
      await categoryApi.bulkDelete({ ids: selectedIds });
      setSelectedIds([]);
      await fetchList();
      return true;
    } catch (err) {
      setResult((prev) => ({ ...prev, data: previous }));
      setError(err instanceof Error ? err.message : "Gagal menghapus kategori terpilih");
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [fetchList, optimisticRemove, result.data, selectedIds]);

  const restoreOne = useCallback(async (id: string) => {
    setIsMutating(true);
    setError(null);

    try {
      await categoryApi.restore(id);
      await fetchList();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal restore kategori");
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [fetchList]);

  const duplicateOne = useCallback(async (category: Category) => {
    setIsMutating(true);
    setError(null);

    try {
      await categoryApi.create({
        name: `${category.name} (Copy)`,
        margin_percent: category.margin_percent ?? category.min_margin,
        min_margin: category.margin_percent ?? category.min_margin,
        program_garansi:
          typeof category.program_garansi === "string"
            ? category.program_garansi
            : category.program_garansi
            ? JSON.stringify(category.program_garansi)
            : "",
        fees: category.fees,
        icon_svg: category.icon_svg ?? "",
      });
      await fetchList();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal duplicate kategori");
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [fetchList]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const idsOnPage = result.data.map((item) => item.id);
      if (idsOnPage.every((id) => prev.includes(id))) {
        return prev.filter((id) => !idsOnPage.includes(id));
      }
      return Array.from(new Set([...prev, ...idsOnPage]));
    });
  }, [result.data]);

  const allSelectedOnPage = useMemo(() => {
    if (result.data.length === 0) return false;
    return result.data.every((item) => selectedIds.includes(item.id));
  }, [result.data, selectedIds]);

  return {
    categories: result.data,
    pagination: result.pagination,
    source: result.source,
    params,
    isLoading,
    isMutating,
    error,
    selectedIds,
    allSelectedOnPage,
    setParams,
    updateParam,
    toggleSort,
    refresh,
    deleteOne,
    bulkDelete,
    restoreOne,
    duplicateOne,
    toggleSelect,
    toggleSelectAll,
    clearSelection: () => setSelectedIds([]),
  };
}

export function useCategory(id?: string) {
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setCategory(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await categoryApi.getById(id);
      setCategory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil detail kategori");
      setCategory(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { category, isLoading, error, refresh };
}

export function useCategoryForm(args?: { id?: string; initialCategory?: Category | null }) {
  const [values, setValues] = useState<CategoryFormValues>(() =>
    args?.initialCategory ? categoryToForm(args.initialCategory) : initialForm()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameCheck, setNameCheck] = useState<{
    checking: boolean;
    exists: boolean;
    message: string;
  }>({
    checking: false,
    exists: false,
    message: "",
  });

  useEffect(() => {
    if (args?.initialCategory) {
      setValues(categoryToForm(args.initialCategory));
    }
  }, [args?.initialCategory]);

  const setField = useCallback(<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setValues(initialForm()), []);

  const copyFeesFromCategory = useCallback((category: Category | null) => {
    if (!category) return;
    setValues((prev) => ({ ...prev, fees: category.fees }));
  }, []);

  const checkName = useCallback(async () => {
    const current = values.name.trim();
    if (!current) return;

    setNameCheck((prev) => ({ ...prev, checking: true }));
    try {
      const result = await categoryApi.checkName({
        name: current,
        exclude_id: args?.id,
      });

      setNameCheck({
        checking: false,
        exists: result.exists,
        message: result.message,
      });
    } catch {
      setNameCheck({
        checking: false,
        exists: false,
        message: "",
      });
    }
  }, [args?.id, values.name]);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    const token = getAuthToken();
    if (!token) {
      setIsSubmitting(false);
      setError("Sesi login tidak ditemukan. Silakan login ulang.");
      return { ok: false as const, unauthorized: true as const };
    }

    try {
      const payload = {
        name: values.name,
        margin_percent: values.min_margin,
        min_margin: values.min_margin,
        program_garansi: values.program_garansi,
        fees: values.fees,
        icon: values.iconFile,
        icon_svg: values.iconSvg,
        remove_icon: values.removeIcon,
      };

      const result = args?.id
        ? await categoryApi.update(args.id, payload)
        : await categoryApi.create(payload);

      return { ok: true as const, data: result };
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      if (axiosError.response?.status === 401) {
        setError("Sesi habis atau token tidak valid. Silakan login ulang.");
        return { ok: false as const, unauthorized: true as const };
      }
      if (axiosError.response?.status === 422) {
        const validationErrors = axiosError.response.data?.errors ?? {};
        const firstValidationError = Object.values(validationErrors).flat().find((message) => Boolean(message));
        if (firstValidationError) {
          setError(firstValidationError);
          return { ok: false as const, unauthorized: false as const };
        }
      }
      if (axiosError.code === "ECONNABORTED") {
        setError("Permintaan timeout. Data kategori cukup besar atau koneksi lambat. Silakan coba lagi.");
        return { ok: false as const, unauthorized: false as const };
      }
      if (axiosError.code === "ERR_CANCELED") {
        setError("Permintaan dibatalkan. Silakan kirim ulang.");
        return { ok: false as const, unauthorized: false as const };
      }
      const message = axiosError.response?.data?.message;
      setError(message || (err instanceof Error ? err.message : "Gagal menyimpan kategori"));
      return { ok: false as const, unauthorized: false as const };
    } finally {
      setIsSubmitting(false);
    }
  }, [args?.id, values]);

  return {
    values,
    setValues,
    setField,
    reset,
    submit,
    checkName,
    copyFeesFromCategory,
    isSubmitting,
    error,
    nameCheck,
  };
}

export function useCategoryStats() {
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await categoryApi.getStats();
      setStats(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil statistik kategori");
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, isLoading, error, refresh };
}

export function useCategoryOptions() {
  const [categories, setCategories] = useState<Category[]>(() => categoryOptionsCache ?? []);
  const [loading, setLoading] = useState(!categoryOptionsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryOptionsCache) {
      setCategories(categoryOptionsCache);
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!categoryOptionsPromise) {
          categoryOptionsPromise = categoryApi.getAll({ perPage: 200 }).then((result) => result.data);
        }
        const rows = await categoryOptionsPromise;
        categoryOptionsCache = rows;
        if (mounted) setCategories(rows);
      } catch {
        if (mounted) setError("Gagal memuat kategori");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCategories();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
        icon: category.icon ?? category.icon_url ?? category.icon_svg ?? null,
        min_margin: category.margin_percent ?? category.min_margin,
      })),
    [categories]
  );

  const getCategory = useCallback(
    (id: string) => categories.find((category) => category.id === id),
    [categories]
  );

  return { categories, loading, error, options, getCategory };
}
