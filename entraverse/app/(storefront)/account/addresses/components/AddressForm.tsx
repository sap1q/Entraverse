"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { isAxiosError } from "@/lib/axios";
import { userAddressApi } from "@/lib/api/user-address";
import type { RegionOption, UserAddress, UserAddressPayload } from "@/lib/api/types/user-address.types";

type AddressFormValues = {
  address_label: string;
  recipient_name: string;
  recipient_phone: string;
  province_id: string;
  city_id: string;
  district_id: string;
  subdistrict: string;
  address_detail: string;
  zip_code: string;
  location_note: string;
  is_default: boolean;
};

type SaveResult = {
  success: boolean;
  message?: string;
};

type RegionField = "province" | "city" | "district" | "subdistrict";

interface AddressFormProps {
  mode: "create" | "edit";
  initialAddress?: UserAddress | null;
  onSave: (payload: UserAddressPayload, addressId?: string) => Promise<SaveResult>;
  cancelHref?: string;
}

const createInitialRetryState = (): Record<RegionField, number> => ({
  province: 0,
  city: 0,
  district: 0,
  subdistrict: 0,
});

const mergeRegionOptions = (primary: RegionOption[], fallback: RegionOption[]): RegionOption[] => {
  if (primary.length === 0) return [...fallback];
  if (fallback.length === 0) return [...primary];

  const existingIds = new Set(primary.map((item) => item.id));
  return [...primary, ...fallback.filter((item) => !existingIds.has(item.id))];
};

const getRegionErrorMessage = (
  error: unknown,
  fallbackMessage: string,
  hasCachedData = false
): string => {
  if (!isAxiosError(error)) {
    return hasCachedData ? `${fallbackMessage} Menampilkan data cache terakhir.` : fallbackMessage;
  }

  const status = error.response?.status;
  const responseMessage = error.response?.data?.message;
  const rawMessage = typeof responseMessage === "string" && responseMessage.trim().length > 0
    ? responseMessage
    : error.message;
  const normalizedMessage = rawMessage.toLowerCase();

  let message = fallbackMessage;

  if (status === 429 || normalizedMessage.includes("rate")) {
    message = "Layanan wilayah sedang sibuk karena terlalu banyak permintaan. Coba lagi beberapa saat.";
  } else if (error.code === "ECONNABORTED" || normalizedMessage.includes("timeout")) {
    message = "Permintaan data wilayah terlalu lama. Periksa koneksi Anda lalu coba lagi.";
  } else if (typeof responseMessage === "string" && responseMessage.trim().length > 0) {
    message = responseMessage;
  }

  return hasCachedData ? `${message} Menampilkan data cache terakhir.` : message;
};

const toDefaultValues = (address?: UserAddress | null): AddressFormValues => ({
  address_label: address?.address_label ?? address?.label ?? "Rumah",
  recipient_name: address?.recipient_name ?? "",
  recipient_phone: address?.recipient_phone ?? address?.phone_number ?? "",
  province_id: address?.province_id ?? "",
  city_id: address?.city_id ?? "",
  district_id: address?.district_id ?? "",
  subdistrict: address?.subdistrict ?? "",
  address_detail: address?.address_detail ?? address?.address_line ?? "",
  zip_code: address?.zip_code ?? "",
  location_note: address?.location_note ?? "",
  is_default: Boolean(address?.is_default ?? address?.is_main),
});

const toSeededRegionOptions = (address?: UserAddress | null): {
  provinces: RegionOption[];
  cities: RegionOption[];
  districts: RegionOption[];
  subdistricts: RegionOption[];
} => ({
  provinces:
    address?.province_id && address.province
      ? [
          {
            id: address.province_id,
            name: address.province,
          },
        ]
      : [],
  cities:
    address?.city_id && address.city
      ? [
          {
            id: address.city_id,
            name: address.city,
          },
        ]
      : [],
  districts:
    address?.district_id && address.district
      ? [
          {
            id: address.district_id,
            name: address.district,
          },
        ]
      : [],
  subdistricts:
    address?.subdistrict
      ? [
          {
            id: address.subdistrict,
            name: address.subdistrict,
            zip_code: address.zip_code,
            postal_code: address.zip_code,
          },
        ]
      : [],
});

export function AddressForm({ mode, initialAddress, onSave, cancelHref = "/account/addresses" }: AddressFormProps) {
  const seededOptions = useMemo(() => toSeededRegionOptions(initialAddress), [initialAddress]);
  const [provinces, setProvinces] = useState<RegionOption[]>(() =>
    mergeRegionOptions(userAddressApi.getCachedProvinces(), seededOptions.provinces)
  );
  const [cities, setCities] = useState<RegionOption[]>(() =>
    initialAddress?.province_id
      ? mergeRegionOptions(userAddressApi.getCachedCities(initialAddress.province_id), seededOptions.cities)
      : seededOptions.cities
  );
  const [districts, setDistricts] = useState<RegionOption[]>(() =>
    initialAddress?.city_id
      ? mergeRegionOptions(userAddressApi.getCachedDistricts(initialAddress.city_id), seededOptions.districts)
      : seededOptions.districts
  );
  const [subdistricts, setSubdistricts] = useState<RegionOption[]>(() =>
    initialAddress?.district_id
      ? mergeRegionOptions(userAddressApi.getCachedSubdistricts(initialAddress.district_id), seededOptions.subdistricts)
      : seededOptions.subdistricts
  );
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSubdistricts, setLoadingSubdistricts] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [regionErrors, setRegionErrors] = useState<Partial<Record<RegionField, string>>>({});
  const [retryState, setRetryState] = useState<Record<RegionField, number>>(createInitialRetryState);
  const previousProvinceIdRef = useRef(initialAddress?.province_id ?? "");
  const previousCityIdRef = useRef(initialAddress?.city_id ?? "");
  const previousDistrictIdRef = useRef(initialAddress?.district_id ?? "");

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    defaultValues: toDefaultValues(initialAddress),
  });

  const provinceId = watch("province_id");
  const cityId = watch("city_id");
  const districtId = watch("district_id");
  const subdistrictName = watch("subdistrict");

  const selectedCity = useMemo(() => cities.find((city) => city.id === cityId) ?? null, [cities, cityId]);
  const selectedSubdistrict = useMemo(
    () => subdistricts.find((subdistrict) => subdistrict.name === subdistrictName) ?? null,
    [subdistrictName, subdistricts]
  );

  const setRegionError = useCallback((field: RegionField, message: string | null) => {
    setRegionErrors((current) => {
      const next = { ...current };

      if (!message) {
        delete next[field];
        return next;
      }

      next[field] = message;
      return next;
    });
  }, []);

  const clearRegionErrors = useCallback((fields: RegionField[]) => {
    setRegionErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });
  }, []);

  const retryRegionLoad = useCallback((field: RegionField) => {
    setRegionError(field, null);
    setRetryState((current) => ({
      ...current,
      [field]: current[field] + 1,
    }));
  }, [setRegionError]);

  const resetRetryCounters = useCallback((fields: RegionField[]) => {
    setRetryState((current) => {
      let hasChanges = false;
      const next = { ...current };

      fields.forEach((field) => {
        if (next[field] !== 0) {
          next[field] = 0;
          hasChanges = true;
        }
      });

      return hasChanges ? next : current;
    });
  }, []);

  useEffect(() => {
    reset(toDefaultValues(initialAddress));
    setProvinces(mergeRegionOptions(userAddressApi.getCachedProvinces(), seededOptions.provinces));
    setCities(
      initialAddress?.province_id
        ? mergeRegionOptions(userAddressApi.getCachedCities(initialAddress.province_id), seededOptions.cities)
        : seededOptions.cities
    );
    setDistricts(
      initialAddress?.city_id
        ? mergeRegionOptions(userAddressApi.getCachedDistricts(initialAddress.city_id), seededOptions.districts)
        : seededOptions.districts
    );
    setSubdistricts(
      initialAddress?.district_id
        ? mergeRegionOptions(userAddressApi.getCachedSubdistricts(initialAddress.district_id), seededOptions.subdistricts)
        : seededOptions.subdistricts
    );
    previousProvinceIdRef.current = initialAddress?.province_id ?? "";
    previousCityIdRef.current = initialAddress?.city_id ?? "";
    previousDistrictIdRef.current = initialAddress?.district_id ?? "";
    setFormError(null);
    setRegionErrors({});
    setRetryState(createInitialRetryState());
  }, [initialAddress, reset, seededOptions]);

  useEffect(() => {
    let aborted = false;
    const loadProvinces = async () => {
      const cachedRows = userAddressApi.getCachedProvinces();
      if (cachedRows.length > 0) {
        setProvinces((current) => mergeRegionOptions(cachedRows, current));
      }

      if (cachedRows.length > 0 && retryState.province === 0) {
        setRegionError("province", null);
        return;
      }

      setLoadingProvinces(true);
      try {
        const rows = await userAddressApi.getProvinces({ force: retryState.province > 0 });
        if (!aborted) {
          setProvinces(rows);
          setRegionError("province", null);
          resetRetryCounters(["province"]);
          const activeProvinceId = getValues("province_id");
          if (activeProvinceId && rows.some((province) => province.id === activeProvinceId)) {
            setValue("province_id", activeProvinceId, {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false,
            });
          }
        }
      } catch (error) {
        if (!aborted) {
          setRegionError(
            "province",
            getRegionErrorMessage(error, "Daftar provinsi belum bisa dimuat.", cachedRows.length > 0)
          );
        }
      } finally {
        if (!aborted) {
          setLoadingProvinces(false);
        }
      }
    };

    void loadProvinces();
    return () => {
      aborted = true;
    };
  }, [getValues, resetRetryCounters, retryState.province, setRegionError, setValue]);

  useEffect(() => {
    const previousProvinceId = previousProvinceIdRef.current;
    const hasProvinceChanged = previousProvinceId !== provinceId;
    previousProvinceIdRef.current = provinceId;

    if (!provinceId) {
      setCities([]);
      setDistricts([]);
      setSubdistricts([]);
      setValue("city_id", "");
      setValue("district_id", "");
      setValue("subdistrict", "");
      setValue("zip_code", "");
      clearErrors(["city_id", "district_id", "subdistrict", "zip_code"]);
      clearRegionErrors(["city", "district", "subdistrict"]);
      resetRetryCounters(["city", "district", "subdistrict"]);
      setLoadingCities(false);
      return;
    }

    if (hasProvinceChanged) {
      setCities(userAddressApi.getCachedCities(provinceId));
      setDistricts([]);
      setSubdistricts([]);
      setValue("city_id", "");
      setValue("district_id", "");
      setValue("subdistrict", "");
      setValue("zip_code", "");
      clearErrors(["city_id", "district_id", "subdistrict", "zip_code"]);
      clearRegionErrors(["city", "district", "subdistrict"]);
      resetRetryCounters(["city", "district", "subdistrict"]);
    }

    let aborted = false;
    const loadCities = async () => {
      const cachedRows = userAddressApi.getCachedCities(provinceId);
      if (cachedRows.length > 0) {
        setCities((current) => mergeRegionOptions(cachedRows, current));
      }

      if (cachedRows.length > 0 && retryState.city === 0) {
        setRegionError("city", null);
        return;
      }

      setLoadingCities(true);
      try {
        const rows = await userAddressApi.getCities(provinceId, { force: retryState.city > 0 });
        if (!aborted) {
          setCities((current) => mergeRegionOptions(rows, current));
          setRegionError("city", null);
          resetRetryCounters(["city"]);
          const activeCityId = getValues("city_id");
          if (!hasProvinceChanged && activeCityId && rows.some((city) => city.id === activeCityId)) {
            setValue("city_id", activeCityId, {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false,
            });
          } else {
            setValue("city_id", "");
            setValue("district_id", "");
            setValue("subdistrict", "");
            setValue("zip_code", "");
            setDistricts([]);
            setSubdistricts([]);
          }
        }
      } catch (error) {
        if (!aborted) {
          setRegionError(
            "city",
            getRegionErrorMessage(error, "Daftar kota/kabupaten belum bisa dimuat.", cachedRows.length > 0)
          );
        }
      } finally {
        if (!aborted) {
          setLoadingCities(false);
        }
      }
    };

    void loadCities();
    return () => {
      aborted = true;
    };
  }, [clearErrors, clearRegionErrors, getValues, provinceId, resetRetryCounters, retryState.city, setRegionError, setValue]);

  useEffect(() => {
    const previousCityId = previousCityIdRef.current;
    const hasCityChanged = previousCityId !== cityId;
    previousCityIdRef.current = cityId;

    if (!cityId) {
      setDistricts([]);
      setSubdistricts([]);
      setValue("district_id", "");
      setValue("subdistrict", "");
      setValue("zip_code", "");
      clearErrors(["district_id", "subdistrict", "zip_code"]);
      clearRegionErrors(["district", "subdistrict"]);
      resetRetryCounters(["district", "subdistrict"]);
      setLoadingDistricts(false);
      return;
    }

    if (hasCityChanged) {
      setDistricts(userAddressApi.getCachedDistricts(cityId));
      setSubdistricts([]);
      setValue("district_id", "");
      setValue("subdistrict", "");
      setValue("zip_code", "");
      clearErrors(["district_id", "subdistrict", "zip_code"]);
      clearRegionErrors(["district", "subdistrict"]);
      resetRetryCounters(["district", "subdistrict"]);
    }

    let aborted = false;
    const loadDistricts = async () => {
      const cachedRows = userAddressApi.getCachedDistricts(cityId);
      if (cachedRows.length > 0) {
        setDistricts((current) => mergeRegionOptions(cachedRows, current));
      }

      if (cachedRows.length > 0 && retryState.district === 0) {
        setRegionError("district", null);
        return;
      }

      setLoadingDistricts(true);
      try {
        const rows = await userAddressApi.getDistricts(cityId, { force: retryState.district > 0 });
        if (!aborted) {
          setDistricts((current) => mergeRegionOptions(rows, current));
          setRegionError("district", null);
          resetRetryCounters(["district"]);
          const activeDistrictId = getValues("district_id");
          if (!hasCityChanged && activeDistrictId && rows.some((district) => district.id === activeDistrictId)) {
            setValue("district_id", activeDistrictId, {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false,
            });
          } else {
            setValue("district_id", "");
            setValue("subdistrict", "");
            setValue("zip_code", "");
            setSubdistricts([]);
          }
        }
      } catch (error) {
        if (!aborted) {
          setRegionError(
            "district",
            getRegionErrorMessage(error, "Daftar kecamatan belum bisa dimuat.", cachedRows.length > 0)
          );
        }
      } finally {
        if (!aborted) {
          setLoadingDistricts(false);
        }
      }
    };

    void loadDistricts();
    return () => {
      aborted = true;
    };
  }, [cityId, clearErrors, clearRegionErrors, getValues, resetRetryCounters, retryState.district, setRegionError, setValue]);

  useEffect(() => {
    const previousDistrictId = previousDistrictIdRef.current;
    const hasDistrictChanged = previousDistrictId !== districtId;
    previousDistrictIdRef.current = districtId;

    if (!districtId) {
      setSubdistricts([]);
      setValue("subdistrict", "");
      setValue("zip_code", "");
      clearErrors(["subdistrict", "zip_code"]);
      clearRegionErrors(["subdistrict"]);
      resetRetryCounters(["subdistrict"]);
      setLoadingSubdistricts(false);
      return;
    }

    if (hasDistrictChanged) {
      setSubdistricts(userAddressApi.getCachedSubdistricts(districtId));
      setValue("subdistrict", "");
      setValue("zip_code", "");
      clearErrors(["subdistrict", "zip_code"]);
      clearRegionErrors(["subdistrict"]);
      resetRetryCounters(["subdistrict"]);
    }

    let aborted = false;
    const loadSubdistricts = async () => {
      const cachedRows = userAddressApi.getCachedSubdistricts(districtId);
      if (cachedRows.length > 0) {
        setSubdistricts((current) => mergeRegionOptions(cachedRows, current));
      }

      if (cachedRows.length > 0 && retryState.subdistrict === 0) {
        setRegionError("subdistrict", null);
        return;
      }

      setLoadingSubdistricts(true);
      try {
        const rows = await userAddressApi.getSubdistricts(districtId, { force: retryState.subdistrict > 0 });
        if (!aborted) {
          setSubdistricts((current) => mergeRegionOptions(rows, current));
          setRegionError("subdistrict", null);
          resetRetryCounters(["subdistrict"]);
          const activeSubdistrict = getValues("subdistrict");
          if (!hasDistrictChanged && activeSubdistrict && rows.some((subdistrict) => subdistrict.name === activeSubdistrict)) {
            setValue("subdistrict", activeSubdistrict, {
              shouldDirty: false,
              shouldTouch: false,
              shouldValidate: false,
            });
          } else {
            setValue("subdistrict", "");
            setValue("zip_code", "");
          }
        }
      } catch (error) {
        if (!aborted) {
          setRegionError(
            "subdistrict",
            getRegionErrorMessage(error, "Daftar kelurahan belum bisa dimuat.", cachedRows.length > 0)
          );
        }
      } finally {
        if (!aborted) {
          setLoadingSubdistricts(false);
        }
      }
    };

    void loadSubdistricts();
    return () => {
      aborted = true;
    };
  }, [clearErrors, clearRegionErrors, districtId, getValues, resetRetryCounters, retryState.subdistrict, setRegionError, setValue]);

  useEffect(() => {
    if (!subdistrictName) {
      setValue("zip_code", "");
      return;
    }

    const resolvedZipCode = selectedSubdistrict?.zip_code ?? selectedCity?.zip_code ?? "";
    setValue("zip_code", resolvedZipCode);
  }, [selectedCity, selectedSubdistrict, setValue, subdistrictName]);

  const formTitle = useMemo(() => (mode === "edit" ? "Edit Alamat" : "Tambah Alamat Baru"), [mode]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const result = await onSave(
      {
        address_label: values.address_label,
        province_id: values.province_id,
        city_id: values.city_id,
        district_id: values.district_id,
        subdistrict: values.subdistrict || null,
        address_detail: values.address_detail,
        zip_code: values.zip_code || null,
        recipient_name: values.recipient_name,
        recipient_phone: values.recipient_phone,
        location_note: values.location_note || null,
        is_default: values.is_default,
      },
      mode === "edit" ? initialAddress?.id : undefined
    );

    if (!result.success) {
      setFormError(result.message ?? "Gagal menyimpan alamat. Periksa kembali data input.");
    }
  });

  const renderLoadingIndicator = (loading: boolean) =>
    loading ? (
      <span className="pointer-events-none absolute inset-y-0 right-10 flex items-center text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    ) : null;

  const renderRegionError = (field: RegionField) =>
    regionErrors[field] ? (
      <div className="mt-1 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <span>{regionErrors[field]}</span>
        <button
          type="button"
          onClick={() => retryRegionLoad(field)}
          className="shrink-0 font-semibold text-amber-900 underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    ) : null;

  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
    >
      <h2 className="text-2xl font-bold text-slate-900">{formTitle}</h2>

      {formError ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Label Alamat
          <input
            {...register("address_label", { required: "Label alamat wajib diisi." })}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            placeholder="Rumah / Kantor"
          />
          {errors.address_label ? <span className="mt-1 block text-xs text-rose-600">{errors.address_label.message}</span> : null}
        </label>

        <label className="text-sm font-medium text-slate-700">
          Nama Penerima
          <input
            {...register("recipient_name", { required: "Nama penerima wajib diisi." })}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            placeholder="Nama lengkap"
          />
          {errors.recipient_name ? <span className="mt-1 block text-xs text-rose-600">{errors.recipient_name.message}</span> : null}
        </label>

        <label className="text-sm font-medium text-slate-700">
          Nomor Telepon
          <input
            {...register("recipient_phone", { required: "Nomor telepon wajib diisi." })}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            placeholder="08xxxxxxxxxx"
          />
          {errors.recipient_phone ? <span className="mt-1 block text-xs text-rose-600">{errors.recipient_phone.message}</span> : null}
        </label>

        <label className="text-sm font-medium text-slate-700 [text-shadow:0_1px_1px_rgba(15,23,42,0.15)]">
          Provinsi
          <Controller
            control={control}
            name="province_id"
            rules={{ required: "Provinsi wajib dipilih." }}
            render={({ field }) => (
              <div className="relative mt-1">
                <select
                  {...field}
                  value={field.value ?? ""}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={loadingProvinces}
                >
                  <option value="">{loadingProvinces && provinces.length === 0 ? "Memuat provinsi..." : "Pilih Provinsi"}</option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
                {renderLoadingIndicator(loadingProvinces)}
              </div>
            )}
          />
          {errors.province_id ? <span className="mt-1 block text-xs text-rose-600">{errors.province_id.message}</span> : null}
          {renderRegionError("province")}
        </label>

        <label className="text-sm font-medium text-slate-700 [text-shadow:0_1px_1px_rgba(15,23,42,0.15)]">
          Kota / Kabupaten
          <Controller
            control={control}
            name="city_id"
            rules={{ required: "Kota / Kabupaten wajib dipilih." }}
            render={({ field }) => (
              <div className="relative mt-1">
                <select
                  {...field}
                  value={field.value ?? ""}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={!provinceId || loadingCities}
                >
                  <option value="">
                    {!provinceId
                      ? "Pilih Provinsi terlebih dulu"
                      : loadingCities && cities.length === 0
                        ? "Memuat kota / kabupaten..."
                        : "Pilih Kota / Kabupaten"}
                  </option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.type ? `${city.type} ` : ""}
                      {city.name}
                    </option>
                  ))}
                </select>
                {renderLoadingIndicator(loadingCities)}
              </div>
            )}
          />
          {errors.city_id ? <span className="mt-1 block text-xs text-rose-600">{errors.city_id.message}</span> : null}
          {renderRegionError("city")}
        </label>

        <label className="text-sm font-medium text-slate-700 [text-shadow:0_1px_1px_rgba(15,23,42,0.15)] sm:col-span-2">
          Kecamatan
          <Controller
            control={control}
            name="district_id"
            rules={{ required: "Kecamatan wajib dipilih." }}
            render={({ field }) => (
              <div className="relative mt-1">
                <select
                  {...field}
                  value={field.value ?? ""}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={!provinceId || !cityId || loadingDistricts}
                >
                  <option value="">
                    {!cityId
                      ? "Pilih Kota / Kabupaten terlebih dulu"
                      : loadingDistricts && districts.length === 0
                        ? "Memuat kecamatan..."
                        : "Pilih Kecamatan"}
                  </option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
                {renderLoadingIndicator(loadingDistricts)}
              </div>
            )}
          />
          {errors.district_id ? <span className="mt-1 block text-xs text-rose-600">{errors.district_id.message}</span> : null}
          {renderRegionError("district")}
        </label>

        <label className="text-sm font-medium text-slate-700 [text-shadow:0_1px_1px_rgba(15,23,42,0.15)]">
          Kelurahan
          <Controller
            control={control}
            name="subdistrict"
            rules={{ required: "Kelurahan wajib dipilih." }}
            render={({ field }) => (
              <div className="relative mt-1">
                <select
                  {...field}
                  value={field.value ?? ""}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={!provinceId || !cityId || !districtId || loadingSubdistricts}
                >
                  <option value="">
                    {!districtId
                      ? "Pilih Kecamatan"
                      : loadingSubdistricts && subdistricts.length === 0
                        ? "Memuat kelurahan..."
                        : "Pilih Kelurahan"}
                  </option>
                  {subdistricts.map((subdistrict) => (
                    <option key={subdistrict.id} value={subdistrict.name}>
                      {subdistrict.name}
                    </option>
                  ))}
                </select>
                {renderLoadingIndicator(loadingSubdistricts)}
              </div>
            )}
          />
          {errors.subdistrict ? <span className="mt-1 block text-xs text-rose-600">{errors.subdistrict.message}</span> : null}
          {renderRegionError("subdistrict")}
        </label>

        <label className="text-sm font-medium text-slate-700">
          Kode Pos
          <input
            {...register("zip_code", {
              required: "Kode pos wajib diisi.",
              pattern: { value: /^\d{5}$/, message: "Kode pos harus 5 digit angka." },
            })}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="12345"
            disabled={!subdistrictName}
            readOnly
          />
          {errors.zip_code ? <span className="mt-1 block text-xs text-rose-600">{errors.zip_code.message}</span> : null}
        </label>

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Detail Alamat
          <textarea
            {...register("address_detail", { required: "Detail alamat wajib diisi." })}
            className="mt-1 min-h-[90px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            placeholder="Jalan, nomor rumah, patokan, RT/RW"
          />
          {errors.address_detail ? <span className="mt-1 block text-xs text-rose-600">{errors.address_detail.message}</span> : null}
        </label>

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Catatan Lokasi (opsional)
          <input
            {...register("location_note")}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            placeholder="Contoh: Tepat di depan minimarket"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            {...register("is_default")}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Jadikan sebagai alamat utama
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan Alamat"}
        </button>
      </div>
    </form>
  );
}
