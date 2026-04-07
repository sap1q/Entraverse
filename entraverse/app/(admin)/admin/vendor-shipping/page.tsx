"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { userAddressApi } from "@/lib/api/user-address";
import type { RegionOption } from "@/lib/api/types/user-address.types";
import { vendorShippingApi } from "@/lib/api/vendor-shipping";
import type { StoreOrigin } from "@/lib/api/vendor-shipping";

type StoreOriginFormValues = {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  province_id: string;
  city_id: string;
  district_id: string;
  subdistrict: string;
  address_detail: string;
  zip_code: string;
  location_note: string;
};

const DEFAULT_VALUES: StoreOriginFormValues = {
  label: "Toko Pusat",
  recipient_name: "",
  recipient_phone: "",
  province_id: "",
  city_id: "",
  district_id: "",
  subdistrict: "",
  address_detail: "",
  zip_code: "",
  location_note: "",
};

const asMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0) return message;
  }

  return fallback;
};

const toFormValues = (origin: StoreOrigin | null): StoreOriginFormValues => {
  if (!origin) return DEFAULT_VALUES;

  return {
    label: origin.label ?? "Toko Pusat",
    recipient_name: origin.recipient_name ?? "",
    recipient_phone: origin.recipient_phone ?? "",
    province_id: origin.province_id ?? "",
    city_id: origin.city_id ?? "",
    district_id: origin.district_id ?? "",
    subdistrict: origin.subdistrict ?? "",
    address_detail: origin.address_detail ?? "",
    zip_code: origin.zip_code ?? "",
    location_note: origin.location_note ?? "",
  };
};

const toSeededOptions = (origin: StoreOrigin | null): {
  provinces: RegionOption[];
  cities: RegionOption[];
  districts: RegionOption[];
  subdistricts: RegionOption[];
} => ({
  provinces:
    origin?.province_id && origin.province_name
      ? [
          {
            id: origin.province_id,
            name: origin.province_name,
          },
        ]
      : [],
  cities:
    origin?.city_id && origin.city_name
      ? [
          {
            id: origin.city_id,
            name: origin.city_name,
            zip_code: origin.zip_code,
            postal_code: origin.zip_code,
          },
        ]
      : [],
  districts:
    origin?.district_id && origin.district_name
      ? [
          {
            id: origin.district_id,
            name: origin.district_name,
          },
        ]
      : [],
  subdistricts:
    origin?.subdistrict
      ? [
          {
            id: origin.subdistrict,
            name: origin.subdistrict,
            zip_code: origin.zip_code,
            postal_code: origin.zip_code,
          },
        ]
      : [],
});

export default function VendorShippingPage() {
  const [origin, setOrigin] = useState<StoreOrigin | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSubdistricts, setLoadingSubdistricts] = useState(false);
  const [provinces, setProvinces] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<RegionOption[]>([]);
  const [districts, setDistricts] = useState<RegionOption[]>([]);
  const [subdistricts, setSubdistricts] = useState<RegionOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast, toasts, dismiss } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StoreOriginFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const provinceId = watch("province_id");
  const cityId = watch("city_id");
  const districtId = watch("district_id");
  const subdistrictName = watch("subdistrict");

  const selectedCity = useMemo(() => cities.find((row) => row.id === cityId) ?? null, [cities, cityId]);
  const selectedSubdistrict = useMemo(
    () => subdistricts.find((row) => row.name === subdistrictName) ?? null,
    [subdistrictName, subdistricts]
  );

  useEffect(() => {
    let aborted = false;

    const loadBootstrap = async () => {
      setBootstrapLoading(true);
      setFormError(null);

      const [originResult, provinceResult] = await Promise.allSettled([
        vendorShippingApi.getOrigin(),
        userAddressApi.getProvinces(),
      ]);

      if (aborted) return;

      if (provinceResult.status === "fulfilled") {
        setProvinces(provinceResult.value);
      } else {
        setFormError(asMessage(provinceResult.reason, "Gagal memuat daftar provinsi."));
      }

      if (originResult.status === "fulfilled") {
        const fetchedOrigin = originResult.value;
        setOrigin(fetchedOrigin);
        reset(toFormValues(fetchedOrigin));

        const seeded = toSeededOptions(fetchedOrigin);
        setCities(seeded.cities);
        setDistricts(seeded.districts);
        setSubdistricts(seeded.subdistricts);

        if (seeded.provinces.length > 0 && provinceResult.status !== "fulfilled") {
          setProvinces(seeded.provinces);
        }
      } else {
        const message = asMessage(originResult.reason, "Origin toko belum tersedia.");
        setOrigin(null);
        reset(DEFAULT_VALUES);
        setFormError((previous) => previous ?? message);
      }

      setBootstrapLoading(false);
    };

    void loadBootstrap();
    return () => {
      aborted = true;
    };
  }, [reset]);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      setDistricts([]);
      setSubdistricts([]);
      setValue("city_id", "");
      setValue("district_id", "");
      setValue("subdistrict", "");
      setValue("zip_code", "");
      return;
    }

    let aborted = false;
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const rows = await userAddressApi.getCities(provinceId);
        if (aborted) return;

        setCities(rows);
        const activeCity = getValues("city_id");
        if (!activeCity || !rows.some((item) => item.id === activeCity)) {
          setValue("city_id", "");
          setValue("district_id", "");
          setValue("subdistrict", "");
          setValue("zip_code", "");
          setDistricts([]);
          setSubdistricts([]);
        }
      } catch (error) {
        if (!aborted) {
          setFormError(asMessage(error, "Gagal memuat kota/kabupaten."));
        }
      } finally {
        if (!aborted) setLoadingCities(false);
      }
    };

    void loadCities();
    return () => {
      aborted = true;
    };
  }, [getValues, provinceId, setValue]);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      setSubdistricts([]);
      setValue("district_id", "");
      setValue("subdistrict", "");
      setValue("zip_code", "");
      return;
    }

    let aborted = false;
    const loadDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const rows = await userAddressApi.getDistricts(cityId);
        if (aborted) return;

        setDistricts(rows);
        const activeDistrict = getValues("district_id");
        if (!activeDistrict || !rows.some((item) => item.id === activeDistrict)) {
          setValue("district_id", "");
          setValue("subdistrict", "");
          setValue("zip_code", "");
          setSubdistricts([]);
        }
      } catch (error) {
        if (!aborted) {
          setFormError(asMessage(error, "Gagal memuat kecamatan."));
        }
      } finally {
        if (!aborted) setLoadingDistricts(false);
      }
    };

    void loadDistricts();
    return () => {
      aborted = true;
    };
  }, [cityId, getValues, setValue]);

  useEffect(() => {
    if (!districtId) {
      setSubdistricts([]);
      setValue("subdistrict", "");
      setValue("zip_code", "");
      return;
    }

    let aborted = false;
    const loadSubdistricts = async () => {
      setLoadingSubdistricts(true);
      try {
        const rows = await userAddressApi.getSubdistricts(districtId);
        if (aborted) return;

        setSubdistricts(rows);
        const activeSubdistrict = getValues("subdistrict");
        if (!activeSubdistrict || !rows.some((item) => item.name === activeSubdistrict)) {
          setValue("subdistrict", "");
          setValue("zip_code", "");
        }
      } catch (error) {
        if (!aborted) {
          setFormError(asMessage(error, "Gagal memuat kelurahan/desa."));
        }
      } finally {
        if (!aborted) setLoadingSubdistricts(false);
      }
    };

    void loadSubdistricts();
    return () => {
      aborted = true;
    };
  }, [districtId, getValues, setValue]);

  useEffect(() => {
    if (!subdistrictName) {
      const cityZip = selectedCity?.zip_code ?? selectedCity?.postal_code ?? "";
      setValue("zip_code", cityZip);
      return;
    }

    const zipCode = selectedSubdistrict?.zip_code ?? selectedSubdistrict?.postal_code ?? selectedCity?.zip_code ?? "";
    setValue("zip_code", zipCode);
  }, [selectedCity, selectedSubdistrict, setValue, subdistrictName]);

  const handleSave = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const payload = {
        label: values.label.trim(),
        recipient_name: values.recipient_name.trim(),
        recipient_phone: values.recipient_phone.trim(),
        province_id: values.province_id.trim(),
        city_id: values.city_id.trim(),
        district_id: values.district_id.trim(),
        subdistrict: values.subdistrict.trim() || null,
        address_detail: values.address_detail.trim(),
        zip_code: values.zip_code.replace(/\D/g, "").slice(0, 5) || null,
        location_note: values.location_note.trim() || null,
      };

      const saved = await vendorShippingApi.saveOrigin(payload);
      setOrigin(saved);
      reset(toFormValues(saved));

      toast({
        title: "Origin Tersimpan",
        description: "Asal lokasi toko berhasil diperbarui untuk ongkir dan pengiriman balik.",
        variant: "success",
      });
    } catch (error) {
      const message = asMessage(error, "Gagal menyimpan origin toko.");
      setFormError(message);
      toast({
        title: "Gagal Menyimpan",
        description: message,
        variant: "destructive",
      });
    }
  });

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Vendor Pengiriman</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tentukan asal lokasi toko untuk kalkulasi RajaOngkir, return, dan trade-in customer.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-semibold">Origin Aktif</p>
            <p className="mt-1">
              Sumber: {origin?.source === "env" ? ".env (fallback)" : "Database"}
              {origin?.city_name ? ` | ${origin.city_name}` : ""}
            </p>
            {origin?.full_address ? <p className="mt-1">{origin.full_address}</p> : null}
          </div>

          {bootstrapLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat data origin dan wilayah...
            </div>
          ) : null}

          {formError ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>
          ) : null}

          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Label Lokasi
              <input
                {...register("label", { required: "Label lokasi wajib diisi." })}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                placeholder="Toko Pusat"
                disabled={bootstrapLoading}
              />
              {errors.label ? <span className="mt-1 block text-xs text-rose-600">{errors.label.message}</span> : null}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Nama Penerima
              <input
                {...register("recipient_name", { required: "Nama penerima wajib diisi." })}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                placeholder="Nama PIC toko"
                disabled={bootstrapLoading}
              />
              {errors.recipient_name ? <span className="mt-1 block text-xs text-rose-600">{errors.recipient_name.message}</span> : null}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Nomor Telepon
              <input
                {...register("recipient_phone", { required: "Nomor telepon wajib diisi." })}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                placeholder="08xxxxxxxxxx"
                disabled={bootstrapLoading}
              />
              {errors.recipient_phone ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.recipient_phone.message}</span>
              ) : null}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Provinsi
              <select
                {...register("province_id", { required: "Provinsi wajib dipilih." })}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                disabled={bootstrapLoading}
              >
                <option value="">Pilih Provinsi</option>
                {provinces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.province_id ? <span className="mt-1 block text-xs text-rose-600">{errors.province_id.message}</span> : null}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Kota/Kabupaten
              <select
                {...register("city_id", { required: "Kota/Kabupaten wajib dipilih." })}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                disabled={bootstrapLoading || !provinceId || loadingCities}
              >
                <option value="">{loadingCities ? "Memuat..." : "Pilih Kota/Kabupaten"}</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.type ? `${item.type} ` : ""}
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.city_id ? <span className="mt-1 block text-xs text-rose-600">{errors.city_id.message}</span> : null}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Kecamatan
              <select
                {...register("district_id", { required: "Kecamatan wajib dipilih." })}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                disabled={bootstrapLoading || !cityId || loadingDistricts}
              >
                <option value="">{loadingDistricts ? "Memuat..." : "Pilih Kecamatan"}</option>
                {districts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.district_id ? <span className="mt-1 block text-xs text-rose-600">{errors.district_id.message}</span> : null}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Kelurahan/Desa
              <select
                {...register("subdistrict")}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                disabled={bootstrapLoading || !districtId || loadingSubdistricts}
              >
                <option value="">{loadingSubdistricts ? "Memuat..." : "Pilih Kelurahan/Desa"}</option>
                {subdistricts.map((item) => (
                  <option key={`${item.id}-${item.name}`} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Kode Pos
              <input
                {...register("zip_code", {
                  pattern: {
                    value: /^\d{5}$/,
                    message: "Kode pos harus 5 digit angka.",
                  },
                })}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                placeholder="12345"
                inputMode="numeric"
                maxLength={5}
                disabled={bootstrapLoading}
              />
              {errors.zip_code ? <span className="mt-1 block text-xs text-rose-600">{errors.zip_code.message}</span> : null}
            </label>

            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Alamat Detail
              <textarea
                {...register("address_detail", { required: "Alamat detail wajib diisi." })}
                className="mt-1 min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                placeholder="Nama jalan, nomor, patokan lokasi"
                disabled={bootstrapLoading}
              />
              {errors.address_detail ? <span className="mt-1 block text-xs text-rose-600">{errors.address_detail.message}</span> : null}
            </label>

            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Catatan Lokasi (Opsional)
              <textarea
                {...register("location_note")}
                className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                placeholder="Jam operasional penerimaan paket, titik drop-off, dll."
                disabled={bootstrapLoading}
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={bootstrapLoading || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Origin Toko
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="fixed right-4 top-4 z-[9999] flex w-[320px] flex-col gap-2">
        {toasts.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => dismiss(item.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm shadow-sm ${
              item.variant === "destructive"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : item.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            <p className="font-semibold">{item.title}</p>
            {item.description ? <p>{item.description}</p> : null}
          </button>
        ))}
      </div>
    </>
  );
}
