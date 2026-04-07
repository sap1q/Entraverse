"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import FeeComponents from "@/components/features/categories/FeeComponents";
import { useCategoryForm } from "@/hooks/useCategories";
import {
  parseDecimalValue,
  parseWarrantyProgram,
  serializeWarrantyProgram,
  WARRANTY_COST_LABEL,
  WARRANTY_PROFIT_LABEL,
  type WarrantyComponent,
  type WarrantyPricingConfig,
} from "@/lib/warrantyProgram";
import { resolveApiOriginUrl } from "@/lib/api-config";
import type { Category } from "@/types/category.types";

const isRawSvg = (value?: string | null): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.startsWith("<svg") || (trimmed.startsWith("<?xml") && trimmed.includes("<svg"));
};

const resolveIconUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isRawSvg(trimmed)) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }

  return resolveApiOriginUrl(trimmed);
};

const createWarrantyId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `warranty-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

type CategoryFormProps = {
  mode: "create" | "edit";
  category?: Category | null;
  categoriesForCopy?: Category[];
  onSuccess?: (category: Category) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export default function CategoryForm({
  mode,
  category,
  categoriesForCopy = [],
  onSuccess,
  onCancel,
  submitLabel,
}: CategoryFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { values, setField, submit, isSubmitting, error, checkName, nameCheck, copyFeesFromCategory } =
    useCategoryForm({ id: category?.id, initialCategory: category ?? null });

  const previewUrl = useMemo(
    () => (values.iconFile ? URL.createObjectURL(values.iconFile) : null),
    [values.iconFile]
  );
  const [warrantyInputValues, setWarrantyInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const svgPreview = previewUrl
    ? previewUrl
    : values.iconSvg.trim()
    ? `data:image/svg+xml;utf8,${encodeURIComponent(values.iconSvg)}`
    : resolveIconUrl(category?.icon_url ?? category?.icon ?? null);

  const warrantyProgram = useMemo(() => parseWarrantyProgram(values.program_garansi), [values.program_garansi]);
  const warrantyComponents = warrantyProgram.components;
  const warrantyPricing = warrantyProgram.pricing;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await submit();
    if (!result.ok && result.unauthorized) {
      const redirect = encodeURIComponent(pathname || "/admin/categories");
      router.push(`/auth/login?redirect=${redirect}`);
      return;
    }
    if (result.ok) onSuccess?.(result.data);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setField("iconFile", file);
    if (file) {
      setField("removeIcon", false);
      setField("iconSvg", "");
    }
  };

  const handleRemoveIcon = () => {
    setField("iconFile", null);
    setField("iconSvg", "");
    setField("removeIcon", true);
  };

  const updateWarrantyProgram = (next: { components?: WarrantyComponent[]; pricing?: WarrantyPricingConfig }) => {
    setField(
      "program_garansi",
      serializeWarrantyProgram({
        components: next.components ?? warrantyComponents,
        pricing: next.pricing ?? warrantyPricing,
      })
    );
  };

  const updateWarrantyComponents = (next: WarrantyComponent[]) => {
    updateWarrantyProgram({ components: next });
  };

  const updateWarrantyPricing = (
    target: keyof WarrantyPricingConfig,
    patch: Partial<WarrantyPricingConfig[keyof WarrantyPricingConfig]>
  ) => {
    updateWarrantyProgram({
      pricing: {
        ...warrantyPricing,
        [target]: {
          ...warrantyPricing[target],
          ...patch,
        },
      },
    });
  };

  const addWarrantyComponent = () => {
    updateWarrantyComponents([
      ...warrantyComponents,
      { id: createWarrantyId(), label: "", valueType: "percent", value: 0, notes: "" },
    ]);
  };

  const normalizeDecimalDraft = (value: string): string =>
    value
      .replace(",", ".")
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");

  const getWarrantyDraftValue = (key: string, fallback: number): string =>
    Object.prototype.hasOwnProperty.call(warrantyInputValues, key)
      ? warrantyInputValues[key]
      : String(fallback ?? 0);

  const setWarrantyDraftValue = (key: string, nextRawValue: string, onCommit: (nextValue: number) => void) => {
    const normalized = normalizeDecimalDraft(nextRawValue);
    setWarrantyInputValues((prev) => ({ ...prev, [key]: normalized }));
    onCommit(parseDecimalValue(normalized));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Kategori</span>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              onBlur={checkName}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
              placeholder="Contoh: Drone Camera"
              required
            />
            {nameCheck.message ? (
              <span className={`text-xs ${nameCheck.exists ? "text-rose-600" : "text-emerald-600"}`}>
                {nameCheck.checking ? "Memeriksa nama..." : nameCheck.message}
              </span>
            ) : null}
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Min Margin (%)</span>
            <input
              key={`${mode}-${category?.id ?? "new"}-min-margin`}
              type="text"
              inputMode="decimal"
              defaultValue={String(values.min_margin ?? "")}
              onChange={(event) => {
                const normalized = normalizeDecimalDraft(event.target.value);
                if (normalized !== event.target.value) {
                  event.target.value = normalized;
                }
                setField("min_margin", parseDecimalValue(normalized));
              }}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300"
              required
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Komponen Program Garansi</span>
              <button
                type="button"
                onClick={addWarrantyComponent}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Komponen
              </button>
            </div>

            <div className="space-y-2 rounded-lg border border-blue-100 bg-white p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Kalkulasi Program Garansi</p>
              {(
                [
                  {
                    key: "cost",
                    label: WARRANTY_COST_LABEL,
                    helper: "Jika %, dihitung dari harga jual varian.",
                  },
                  {
                    key: "profit",
                    label: WARRANTY_PROFIT_LABEL,
                    helper: "Jika %, dihitung dari nilai Biaya Program Garansi.",
                  },
                ] as const
              ).map((row) => (
                <div key={row.key} className="grid gap-2 md:grid-cols-12">
                  <div className="md:col-span-5 flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    {row.label}
                  </div>
                  <select
                    value={warrantyPricing[row.key].valueType}
                    onChange={(event) =>
                      updateWarrantyPricing(row.key, {
                        valueType: event.target.value === "amount" ? "amount" : "percent",
                      })
                    }
                    className="md:col-span-2 h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                  >
                    <option value="percent">%</option>
                    <option value="amount">Rp</option>
                  </select>
                  <input
                    type="text"
                    inputMode={warrantyPricing[row.key].valueType === "amount" ? "numeric" : "decimal"}
                    value={getWarrantyDraftValue(`pricing-${row.key}`, Number(warrantyPricing[row.key].value) || 0)}
                    onChange={(event) =>
                      setWarrantyDraftValue(`pricing-${row.key}`, event.target.value, (nextValue) =>
                        updateWarrantyPricing(row.key, {
                          value: nextValue,
                        })
                      )
                    }
                    className="md:col-span-2 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    placeholder="Nilai"
                  />
                  <p className="md:col-span-5 flex items-center text-[11px] text-slate-500">{row.helper}</p>
                </div>
              ))}
            </div>

            {warrantyComponents.length > 0 ? (
              <div className="space-y-2">
                {warrantyComponents.map((component, index) => (
                  <div key={component.id ?? `warranty-component-${index}`} className="grid gap-2 md:grid-cols-12">
                    <input
                      value={component.label}
                      onChange={(event) => {
                        const next = [...warrantyComponents];
                        next[index] = { ...next[index], label: event.target.value };
                        updateWarrantyComponents(next);
                      }}
                      className="md:col-span-5 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      placeholder="Contoh: Toko - 1 Tahun / Distributor"
                    />
                    <select
                      value={component.valueType}
                      onChange={(event) => {
                        const next = [...warrantyComponents];
                        next[index] = {
                          ...next[index],
                          valueType: event.target.value === "amount" ? "amount" : "percent",
                        };
                        updateWarrantyComponents(next);
                      }}
                      className="md:col-span-2 h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                      title="Jenis biaya garansi"
                    >
                      <option value="percent">%</option>
                      <option value="amount">Rp</option>
                    </select>
                    <input
                      type="text"
                      inputMode={component.valueType === "amount" ? "numeric" : "decimal"}
                      value={getWarrantyDraftValue(
                        `component-${component.id ?? index}`,
                        Number(component.value) || 0
                      )}
                      onChange={(event) => {
                        setWarrantyDraftValue(`component-${component.id ?? index}`, event.target.value, (nextValue) => {
                          const next = [...warrantyComponents];
                          next[index] = { ...next[index], value: nextValue };
                          updateWarrantyComponents(next);
                        });
                      }}
                      className="md:col-span-2 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      placeholder="Nilai"
                    />
                    <input
                      value={component.notes ?? ""}
                      onChange={(event) => {
                        const next = [...warrantyComponents];
                        next[index] = { ...next[index], notes: event.target.value };
                        updateWarrantyComponents(next);
                      }}
                      className="md:col-span-2 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      placeholder="Catatan opsional"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = warrantyComponents.filter((_, rowIndex) => rowIndex !== index);
                        updateWarrantyComponents(next);
                      }}
                      className="md:col-span-1 inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                      title="Hapus komponen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">
                Belum ada komponen. Tambahkan contoh: <span className="font-semibold">Toko - 1 Tahun</span>.
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {warrantyComponents.map((component, index) => (
                <span
                  key={`chip-${component.id ?? index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700"
                >
                  {(component.label || "Komponen baru") + " - " + (component.valueType === "amount" ? "Rp" : "%") + " " + (Number(component.value) || 0)}
                  <button
                    type="button"
                    onClick={() => {
                      const next = warrantyComponents.filter((_, rowIndex) => rowIndex !== index);
                      updateWarrantyComponents(next);
                    }}
                    className="rounded-full p-0.5 hover:bg-blue-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">IKON KATEGORI (PNG/SVG)</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={openFilePicker}
                  aria-label="Upload ikon kategori PNG atau SVG"
                  className="group relative flex h-56 w-full max-w-[420px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-grid-pattern transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {svgPreview ? (
                    <>
                      <Image
                        src={svgPreview}
                        alt="Preview ikon kategori"
                        width={136}
                        height={136}
                        className="h-28 w-28 object-contain sm:h-32 sm:w-32"
                        unoptimized
                      />
                      <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/0 transition-colors duration-200 group-hover:bg-white/25" />
                    </>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-9 w-9 text-slate-400 transition-colors group-hover:text-blue-500" />
                      <p className="mt-2 text-xs font-medium text-slate-500 group-hover:text-blue-600">
                        Klik untuk upload PNG/SVG
                      </p>
                    </div>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Ganti gambar ikon kategori"
                  >
                    Ganti Gambar
                  </button>

                  {svgPreview ? (
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      aria-label="Hapus ikon kategori"
                      title="Hapus ikon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <p className="inline-flex items-center gap-1.5 text-center text-xs text-slate-500">
                  <Info className="h-3.5 w-3.5" />
                  Gunakan format .png, .jpg, .jpeg, .webp, atau .svg dengan aspek rasio 1:1 untuk hasil terbaik.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="sr-only"
                  aria-label="Pilih file ikon PNG, JPG, WEBP, atau SVG"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Fee Components</h2>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Copy fee dari kategori</span>
            <select
              className="h-9 rounded-lg border border-slate-200 px-2"
              defaultValue=""
              onChange={(event) => {
                const selected = categoriesForCopy.find((item) => item.id === event.target.value) ?? null;
                copyFeesFromCategory(selected);
              }}
            >
              <option value="">Pilih kategori</option>
              {categoriesForCopy
                .filter((item) => item.id !== category?.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <FeeComponents fees={values.fees} onChange={(next) => setField("fees", next)} />
      </section>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {isSubmitting ? (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 w-1/3 animate-pulse rounded-full bg-blue-600"
            />
          </div>
          <p className="text-xs text-slate-500">Mengirim data...</p>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Batal
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel ?? (mode === "create" ? "Simpan Kategori" : "Update Kategori")}
        </button>
      </div>
    </form>
  );
}
