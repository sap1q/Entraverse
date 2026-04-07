export type AdminRole = "superadmin" | "admin" | "staff" | "editor";

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: AdminRole;
}

export interface ApiMeta {
  timestamp: string;
  version: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]> | null;
  meta?: ApiMeta;
}

export interface AuthPayload {
  token: string;
  token_type: "Bearer";
  admin: Admin;
  expires_in?: number;
  refresh_token?: string;
}

export type AuthResponse = ApiResponse<AuthPayload>;
