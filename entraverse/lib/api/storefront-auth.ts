import { isAxiosError } from "axios";
import client from "@/lib/api/client";
import { userProfileApi } from "@/lib/api/user-profile";
import type { UserProfile } from "@/lib/api/types/user-profile.types";
import { CUSTOMER_SESSION_ENDPOINTS } from "@/src/constants/auth-cookies";

type CustomerLoginPayload = {
  email: string;
  password: string;
  remember?: boolean;
};

type CustomerRegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

const resolveErrorMessage = (error: unknown, fallback: string): never => {
  if (isAxiosError(error)) {
    throw error;
  }

  throw new Error(fallback);
};

export const storefrontAuthApi = {
  async login(payload: CustomerLoginPayload): Promise<UserProfile> {
    try {
      await client.post(CUSTOMER_SESSION_ENDPOINTS.login, payload);
      return await userProfileApi.getProfile();
    } catch (error) {
      return resolveErrorMessage(error, "Login customer gagal.");
    }
  },

  async register(payload: CustomerRegisterPayload): Promise<UserProfile> {
    try {
      await client.post(CUSTOMER_SESSION_ENDPOINTS.register, payload);
      return await userProfileApi.getProfile();
    } catch (error) {
      return resolveErrorMessage(error, "Registrasi customer gagal.");
    }
  },

  async logout(): Promise<void> {
    try {
      await client.post(CUSTOMER_SESSION_ENDPOINTS.logout);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        return;
      }

      throw error;
    }
  },
};
