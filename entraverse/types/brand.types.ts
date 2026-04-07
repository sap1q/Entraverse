export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  logo_url?: string | null;
  description: string | null;
  is_active: boolean;
  product_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BrandListMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface BrandListResponse {
  success: boolean;
  data: Brand[];
  meta: BrandListMeta;
}

export interface BrandMutationPayload {
  name?: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
  logo?: File | null;
  remove_logo?: boolean;
}
