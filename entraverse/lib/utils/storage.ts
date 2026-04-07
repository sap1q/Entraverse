import { TokenService, type UserProfile } from "@/src/lib/auth/tokens";
import type { Admin } from "@/types/auth.types";

const canUseStorage = () => typeof window !== "undefined";
const toUserProfile = (admin: Admin): UserProfile => ({
  id: admin.id,
  email: admin.email,
  name: admin.name,
  role: admin.role,
});

export const setToken = (token: string, remember = false, expiresIn?: number, refreshToken?: string | null) => {
  TokenService.setToken(token, remember, expiresIn, refreshToken);
};

export const getToken = (): string | null => {
  return TokenService.hasValidToken() ? TokenService.getToken() : null;
};

export const removeToken = () => {
  TokenService.clearToken();
};

export const setStoredAdmin = (admin: Admin) => {
  if (!canUseStorage()) return;
  TokenService.setUserProfile(toUserProfile(admin));
};

export const getStoredAdmin = (): Admin | null => {
  const profile = TokenService.getUserProfile();
  return profile ? profile as Admin : null;
};

export const removeStoredAdmin = () => {
  TokenService.clearUserProfile();
};
