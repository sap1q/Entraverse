"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { authApi } from "@/lib/api/auth";
import { clearPersistedAuth, persistAuthToken } from "@/lib/axios";
import { TokenService } from "@/src/lib/auth/tokens";
import type { Admin, LoginCredentials, RegisterData } from "@/types/auth.types";

type AuthErrors = Record<string, string[]>;

type AuthState = {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  fieldErrors: AuthErrors;
};

type ErrorPayload = {
  message?: string;
  errors?: AuthErrors;
};

const initialState: AuthState = {
  admin: null,
  isAuthenticated: false,
  isLoading: false,
  error: "",
  fieldErrors: {},
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const profile = TokenService.getUserType() === "admin" ? TokenService.getUserProfile() : null;
    return {
      ...initialState,
      admin: profile ? profile as Admin : null,
      isAuthenticated: Boolean(profile && TokenService.hasValidToken()),
    };
  });

  const setLoading = (isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  };

  const setErrorState = (message: string, fieldErrors: AuthErrors = {}) => {
    setState((prev) => ({ ...prev, error: message, fieldErrors }));
  };

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: "", fieldErrors: {} }));
  }, []);

  useEffect(() => {
    TokenService.migrateLegacyTokens();

    const token = TokenService.getToken();
    if (token) {
      persistAuthToken(token);
    }

    const unsubscribeLogout = TokenService.on("logout", () => {
      setState({ ...initialState });
    });

    const unsubscribeExpired = TokenService.on("session-expired", () => {
      setState((prev) => ({
        ...prev,
        admin: null,
        isAuthenticated: false,
        error: "Sesi Anda telah berakhir. Silakan login kembali.",
      }));
    });

    return () => {
      unsubscribeLogout();
      unsubscribeExpired();
    };
  }, []);

  const validateLogin = useCallback((payload: LoginCredentials): AuthErrors => {
    const errors: AuthErrors = {};

    if (!payload.email?.trim()) {
      errors.email = ["Email wajib diisi."];
    } else if (!emailRegex.test(payload.email.trim())) {
      errors.email = ["Format email tidak valid."];
    }

    if (!payload.password) {
      errors.password = ["Password wajib diisi."];
    } else if (payload.password.length < 6) {
      errors.password = ["Password minimal 6 karakter."];
    }

    return errors;
  }, []);

  const validateRegister = useCallback((payload: RegisterData): AuthErrors => {
    const errors: AuthErrors = {};

    if (!payload.name?.trim()) errors.name = ["Nama wajib diisi."];
    if (!payload.email?.trim()) {
      errors.email = ["Email wajib diisi."];
    } else if (!emailRegex.test(payload.email.trim())) {
      errors.email = ["Format email tidak valid."];
    }
    if (!payload.password) {
      errors.password = ["Password wajib diisi."];
    } else if (payload.password.length < 8) {
      errors.password = ["Password minimal 8 karakter."];
    }
    if (!payload.password_confirmation) {
      errors.password_confirmation = ["Konfirmasi password wajib diisi."];
    } else if (payload.password_confirmation !== payload.password) {
      errors.password_confirmation = ["Konfirmasi password tidak cocok."];
    }

    return errors;
  }, []);

  const parseAxiosError = (error: unknown) => {
    const axiosError = error as AxiosError<ErrorPayload>;
    const status = axiosError.response?.status;
    const payload = axiosError.response?.data;

    if (process.env.NODE_ENV === "development") {
      console.debug("[Auth Error]", { status, payload });
    }

    return {
      status,
      message: payload?.message || axiosError.message || "Terjadi kesalahan.",
      fieldErrors: payload?.errors || {},
    };
  };

  const checkAuth = useCallback(async () => {
    if (!TokenService.hasValidToken()) {
      setState((prev) => ({ ...prev, admin: null, isAuthenticated: false }));
      return false;
    }

    setLoading(true);
    clearError();

    try {
      const response = await authApi.getProfile();
      const admin = response.data;
      TokenService.setUserProfile({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      });
      setState((prev) => ({
        ...prev,
        admin,
        isAuthenticated: true,
      }));
      return true;
    } catch {
      clearPersistedAuth();
      setState((prev) => ({ ...prev, admin: null, isAuthenticated: false }));
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const clientErrors = validateLogin(credentials);
    if (Object.keys(clientErrors).length > 0) {
      setErrorState("Data login tidak valid.", clientErrors);
      return false;
    }

    setLoading(true);
    clearError();

    try {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Auth Login Payload]", {
          email: credentials.email,
          password: "***",
          remember: Boolean(credentials.remember),
        });
      }

      const response = await authApi.login({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        remember: credentials.remember,
      });

      persistAuthToken(
        response.data.token,
        Boolean(credentials.remember),
        response.data.expires_in,
        response.data.refresh_token
      );
      TokenService.setUserProfile({
        id: response.data.admin.id,
        email: response.data.admin.email,
        name: response.data.admin.name,
        role: response.data.admin.role,
      });

      setState((prev) => ({
        ...prev,
        admin: response.data.admin,
        isAuthenticated: true,
      }));

      return true;
    } catch (error) {
      const parsed = parseAxiosError(error);
      setErrorState(parsed.message, parsed.fieldErrors);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearError, validateLogin]);

  const register = useCallback(async (payload: RegisterData) => {
    const clientErrors = validateRegister(payload);
    if (Object.keys(clientErrors).length > 0) {
      setErrorState("Data registrasi tidak valid.", clientErrors);
      return false;
    }

    setLoading(true);
    clearError();

    try {
      const response = await authApi.register({
        ...payload,
        email: payload.email.trim().toLowerCase(),
      });

      persistAuthToken(
        response.data.token,
        true,
        response.data.expires_in,
        response.data.refresh_token
      );
      TokenService.setUserProfile({
        id: response.data.admin.id,
        email: response.data.admin.email,
        name: response.data.admin.name,
        role: response.data.admin.role,
      });

      setState((prev) => ({
        ...prev,
        admin: response.data.admin,
        isAuthenticated: true,
      }));

      return true;
    } catch (error) {
      const parsed = parseAxiosError(error);
      setErrorState(parsed.message, parsed.fieldErrors);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearError, validateRegister]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch {
      // logout client-side tetap dijalankan meski request gagal
    } finally {
      clearPersistedAuth();
      setState({ ...initialState });
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated && TokenService.hasValidToken()) {
      void checkAuth();
    }
  }, [checkAuth, state.isAuthenticated]);

  return useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    checkAuth,
    clearError,
    validateLogin,
    validateRegister,
  }), [state, login, register, logout, checkAuth, clearError, validateLogin, validateRegister]);
}
