import api, { isAxiosError } from "@/lib/axios";
import type {
  RegionOption,
  UserAddress,
  UserAddressApiResponse,
  UserAddressPayload,
} from "@/lib/api/types/user-address.types";

type UnknownRecord = Record<string, unknown>;
type CachedRegionRequestOptions = {
  force?: boolean;
};

const asObject = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const preservedLocationWords = new Set(["DI", "DKI", "DIY", "NAD", "NTB", "NTT"]);

const formatLocationWord = (word: string): string => {
  if (preservedLocationWords.has(word) || /^[IVXLCDM]+$/.test(word)) {
    return word;
  }

  return word.toLowerCase().replace(/(^|[-/'])[a-z]/g, (match) => match.toUpperCase());
};

const formatLocationText = (value: unknown): string | null => {
  const text = asText(value);
  if (!text) return null;

  return text
    .split(/\s+/)
    .map((word) => formatLocationWord(word))
    .join(" ");
};

const asUserAddress = (value: unknown): UserAddress | null => {
  const row = asObject(value);
  const id = asText(row.id);
  const recipientName = asText(row.recipient_name);
  const addressDetail = asText(row.address_detail) ?? asText(row.address_line);

  if (!id || !recipientName || !addressDetail) return null;

  const province = formatLocationText(asText(row.province) ?? asText(row.province_name));
  const city = formatLocationText(asText(row.city) ?? asText(row.city_name));
  const district = formatLocationText(asText(row.district) ?? asText(row.district_name) ?? asText(row.kecamatan));
  const subdistrict = formatLocationText(
    asText(row.subdistrict) ?? asText(row.subdistrict_name) ?? asText(row.kelurahan)
  );
  const zipCode = asText(row.zip_code) ?? asText(row.postal_code);
  const locationNote = asText(row.location_note) ?? asText(row.notes) ?? asText(row.note);
  const addressLabel = asText(row.address_label) ?? asText(row.label);
  const recipientPhone = asText(row.recipient_phone) ?? asText(row.phone_number);
  const provinceId = asText(row.province_id);
  const cityId = asText(row.city_id);
  const districtId = asText(row.district_id);
  const isDefault = Boolean(row.is_default ?? row.is_main);
  const isActive = row.is_active === undefined ? true : Boolean(row.is_active);

  return {
    id,
    address_label: addressLabel,
    label: addressLabel,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    phone_number: recipientPhone,
    address_detail: addressDetail,
    address_line: addressDetail,
    province_id: provinceId,
    city_id: cityId,
    district_id: districtId,
    district,
    subdistrict,
    city,
    province,
    zip_code: zipCode,
    location_note: locationNote,
    full_address: [addressDetail, subdistrict, district, city, province, zipCode].filter(Boolean).join(", "),
    is_default: isDefault,
    is_main: isDefault,
    is_active: isActive,
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
  };
};

const extractList = (payload: unknown): UserAddress[] => {
  const source = asObject(payload);
  const data = source.data;
  if (!Array.isArray(data)) return [];

  return data
    .map(asUserAddress)
    .filter((item): item is UserAddress => item !== null);
};

const extractSingle = (payload: unknown): UserAddress | null => {
  const source = asObject(payload);
  return asUserAddress(source.data);
};

const asRegionOption = (value: unknown): RegionOption | null => {
  const row = asObject(value);
  const id =
    asText(row.id) ??
    asText(row.province_id) ??
    asText(row.city_id) ??
    asText(row.district_id) ??
    asText(row.subdistrict_id);
  const name = formatLocationText(
    asText(row.name) ??
      asText(row.province) ??
      asText(row.province_name) ??
      asText(row.city_name) ??
      asText(row.district_name) ??
      asText(row.subdistrict_name)
  );
  if (!id || !name) return null;

  return {
    id,
    name,
    type: formatLocationText(asText(row.type)),
    zip_code: asText(row.zip_code) ?? asText(row.postal_code),
    postal_code: asText(row.postal_code) ?? asText(row.zip_code),
  };
};

const cloneRegionOptions = (rows: RegionOption[]): RegionOption[] => rows.map((row) => ({ ...row }));

const getRegionRows = (payload: unknown): unknown[] => {
  const source = asObject(payload);
  const data = source.data;

  if (Array.isArray(data)) {
    return data;
  }

  const nestedData = asObject(data);
  if (Array.isArray(nestedData.results)) {
    return nestedData.results;
  }

  const wrappedRajaOngkir = asObject(source.rajaongkir);
  if (Array.isArray(wrappedRajaOngkir.results)) {
    return wrappedRajaOngkir.results;
  }

  if (Array.isArray(source.results)) {
    return source.results;
  }

  return [];
};

const extractRegionList = (payload: unknown): RegionOption[] => {
  return getRegionRows(payload)
    .map(asRegionOption)
    .filter((item): item is RegionOption => item !== null);
};

const regionCache = {
  provinces: null as RegionOption[] | null,
  cities: new Map<string, RegionOption[]>(),
  districts: new Map<string, RegionOption[]>(),
  subdistricts: new Map<string, RegionOption[]>(),
};

const regionPendingRequests = {
  provinces: null as Promise<RegionOption[]> | null,
  cities: new Map<string, Promise<RegionOption[]>>(),
  districts: new Map<string, Promise<RegionOption[]>>(),
  subdistricts: new Map<string, Promise<RegionOption[]>>(),
};

const normalizeRegionKey = (value: string): string => value.trim();

const getCachedMappedRegionOptions = (
  store: Map<string, RegionOption[]>,
  key: string
): RegionOption[] => cloneRegionOptions(store.get(normalizeRegionKey(key)) ?? []);

const runCachedRegionRequest = async (
  key: string,
  cacheStore: Map<string, RegionOption[]>,
  pendingStore: Map<string, Promise<RegionOption[]>>,
  request: () => Promise<RegionOption[]>,
  options?: CachedRegionRequestOptions
): Promise<RegionOption[]> => {
  const normalizedKey = normalizeRegionKey(key);
  const shouldForce = options?.force === true;

  if (!shouldForce) {
    const cachedRows = cacheStore.get(normalizedKey);
    if (cachedRows) {
      return cloneRegionOptions(cachedRows);
    }

    const pendingRequest = pendingStore.get(normalizedKey);
    if (pendingRequest) {
      return pendingRequest.then((rows) => cloneRegionOptions(rows));
    }
  }

  const nextRequest = request()
    .then((rows) => {
      cacheStore.set(normalizedKey, cloneRegionOptions(rows));
      return cloneRegionOptions(rows);
    })
    .finally(() => {
      pendingStore.delete(normalizedKey);
    });

  pendingStore.set(normalizedKey, nextRequest);

  return nextRequest.then((rows) => cloneRegionOptions(rows));
};

const shouldTryNextEndpoint = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status ?? 0;
  return status === 404 || status === 405;
};

const tryAddressMutation = async <T extends { data: unknown }>(attempts: Array<() => Promise<T>>): Promise<T> => {
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      if (shouldTryNextEndpoint(error)) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("Endpoint alamat tidak tersedia.");
};

export const userAddressApi = {
  getCachedProvinces(): RegionOption[] {
    return cloneRegionOptions(regionCache.provinces ?? []);
  },

  getCachedCities(provinceId: string): RegionOption[] {
    return getCachedMappedRegionOptions(regionCache.cities, provinceId);
  },

  getCachedDistricts(cityId: string): RegionOption[] {
    return getCachedMappedRegionOptions(regionCache.districts, cityId);
  },

  getCachedSubdistricts(districtId: string): RegionOption[] {
    return getCachedMappedRegionOptions(regionCache.subdistricts, districtId);
  },

  async getAll(): Promise<UserAddress[]> {
    const response = await api.get<UserAddressApiResponse<UserAddress[]>>("/user-addresses");
    return extractList(response.data);
  },

  async create(payload: UserAddressPayload): Promise<UserAddress> {
    const response = await api.post<UserAddressApiResponse<UserAddress>>("/user-addresses", payload);
    const mapped = extractSingle(response.data);
    if (!mapped) throw new Error("Respons alamat tidak valid.");
    return mapped;
  },

  async update(addressId: string, payload: UserAddressPayload): Promise<UserAddress> {
    const response = await tryAddressMutation([
      () => api.put<UserAddressApiResponse<UserAddress>>(`/user-addresses/${addressId}`, payload),
      () => api.patch<UserAddressApiResponse<UserAddress>>(`/user-addresses/${addressId}`, payload),
    ]);
    const mapped = extractSingle(response.data);
    if (!mapped) throw new Error("Respons alamat tidak valid.");
    return mapped;
  },

  async setMain(addressId: string): Promise<UserAddress> {
    const response = await tryAddressMutation([
      () => api.patch<UserAddressApiResponse<UserAddress>>(`/user-addresses/${addressId}/set-main`),
      () => api.patch<UserAddressApiResponse<UserAddress>>(`/user/addresses/${addressId}/set-main`),
      () =>
        api.patch<UserAddressApiResponse<UserAddress>>("/user-addresses/set-main", {
          address_id: addressId,
        }),
      () =>
        api.patch<UserAddressApiResponse<UserAddress>>("/user/addresses/set-main", {
          address_id: addressId,
        }),
    ]);

    const mapped = extractSingle(response.data);
    if (!mapped) {
      throw new Error("Respons alamat tidak valid.");
    }
    return mapped;
  },

  async remove(addressId: string): Promise<void> {
    await tryAddressMutation([
      () => api.delete(`/user-addresses/${addressId}`),
      () => api.delete(`/user/addresses/${addressId}`),
    ]);
  },

  async getProvinces(options?: CachedRegionRequestOptions): Promise<RegionOption[]> {
    const shouldForce = options?.force === true;

    if (!shouldForce && regionCache.provinces) {
      return cloneRegionOptions(regionCache.provinces);
    }

    if (!shouldForce && regionPendingRequests.provinces) {
      return regionPendingRequests.provinces.then((rows) => cloneRegionOptions(rows));
    }

    const nextRequest = api
      .get<UserAddressApiResponse<RegionOption[]>>("/rajaongkir/provinces")
      .then((response) => {
        const rows = extractRegionList(response.data);
        regionCache.provinces = cloneRegionOptions(rows);
        return cloneRegionOptions(rows);
      })
      .finally(() => {
        regionPendingRequests.provinces = null;
      });

    regionPendingRequests.provinces = nextRequest;

    return nextRequest.then((rows) => cloneRegionOptions(rows));
  },

  async getCities(provinceId: string, options?: CachedRegionRequestOptions): Promise<RegionOption[]> {
    return runCachedRegionRequest(
      provinceId,
      regionCache.cities,
      regionPendingRequests.cities,
      async () => {
        const response = await api.get<UserAddressApiResponse<RegionOption[]>>("/rajaongkir/cities", {
          params: { province_id: provinceId },
        });

        return extractRegionList(response.data);
      },
      options
    );
  },

  async getSubdistricts(districtId: string, options?: CachedRegionRequestOptions): Promise<RegionOption[]> {
    return runCachedRegionRequest(
      districtId,
      regionCache.subdistricts,
      regionPendingRequests.subdistricts,
      async () => {
        const response = await api.get<UserAddressApiResponse<RegionOption[]>>("/rajaongkir/subdistricts", {
          params: { district_id: districtId },
        });

        return extractRegionList(response.data);
      },
      options
    );
  },

  async getDistricts(cityId: string, options?: CachedRegionRequestOptions): Promise<RegionOption[]> {
    return runCachedRegionRequest(
      cityId,
      regionCache.districts,
      regionPendingRequests.districts,
      async () => {
        const response = await api.get<UserAddressApiResponse<RegionOption[]>>("/rajaongkir/districts", {
          params: { city_id: cityId },
        });

        return extractRegionList(response.data);
      },
      options
    );
  },
};
