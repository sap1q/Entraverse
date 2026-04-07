export interface Banner {
  id: string;
  title?: string | null;
  alt_text?: string | null;
  image_path: string;
  image_url: string;
  link_url?: string | null;
  order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface BannerFormData {
  title?: string;
  alt_text?: string;
  link_url?: string;
  is_active?: boolean;
  image?: File | null;
}

export interface BannerReorderItem {
  id: string;
  order: number;
}

export interface BannerApiResponse<T = Banner | Banner[]> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
  errors?: Record<string, string[]>;
}
