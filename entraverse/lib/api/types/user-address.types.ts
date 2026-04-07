export type UserAddress = {
  id: string;
  address_label: string | null;
  label: string | null;
  recipient_name: string;
  recipient_phone: string | null;
  phone_number: string | null;
  address_detail: string;
  address_line: string;
  province_id: string | null;
  city_id: string | null;
  district_id: string | null;
  district: string | null;
  subdistrict: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
  location_note: string | null;
  full_address: string;
  is_default: boolean;
  is_main: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type UserAddressApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
};

export type RegionOption = {
  id: string;
  name: string;
  type?: string | null;
  zip_code?: string | null;
  postal_code?: string | null;
};

export type UserAddressPayload = {
  address_label: string;
  province_id: string;
  city_id: string;
  district_id: string;
  subdistrict?: string | null;
  address_detail: string;
  zip_code?: string | null;
  recipient_name: string;
  recipient_phone: string;
  location_note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
  is_active?: boolean;
};
