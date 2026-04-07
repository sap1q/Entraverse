import { isAxiosError } from "axios";
import client from "@/lib/api/client";
import { clearPersistedAuth } from "@/lib/axios";
import { AUTH_ENDPOINTS } from "@/lib/constants";
import { TokenService } from "@/src/lib/auth/tokens";
import type { Admin, ApiResponse, AuthPayload, LoginCredentials, RegisterData } from "@/types/auth.types";

const normalizeError = (err: unknown, fallback: string): never => {
  if (isAxiosError(err)) {
    throw new Error(err.response?.data?.message ?? fallback);
  }

  throw err;
};

export const authApi = {
  async login(payload: LoginCredentials): Promise<ApiResponse<AuthPayload>> {
    try {
      const response = await client.post<ApiResponse<AuthPayload>>(AUTH_ENDPOINTS.login, payload);
      return response.data;
    } catch (err) {
      return normalizeError(err, "Login gagal.");
    }
  },

  async register(payload: RegisterData): Promise<ApiResponse<AuthPayload>> {
    try {
      const response = await client.post<ApiResponse<AuthPayload>>(AUTH_ENDPOINTS.register, payload);
      return response.data;
    } catch (err) {
      return normalizeError(err, "Registrasi admin gagal.");
    }
  },

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await client.post<ApiResponse<null>>(AUTH_ENDPOINTS.logout);
      return response.data;
    } catch (err) {
      console.warn("[Auth] Server logout failed:", err);
      return {
        success: false,
        message: err instanceof Error ? err.message : "Logout gagal.",
        data: null,
      };
    } finally {
      clearPersistedAuth();
    }
  },

  async getProfile(): Promise<ApiResponse<Admin>> {
    try {
      const response = await client.get<ApiResponse<Admin>>(AUTH_ENDPOINTS.profile);
      return response.data;
    } catch (err) {
      return normalizeError(err, "Gagal memuat profil admin.");
    }
  },

  async refreshToken(): Promise<string | null> {
    return TokenService.refreshToken();
  },
};
