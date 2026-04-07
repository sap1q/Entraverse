import {
  LEGACY_AUTH_TOKEN_KEYS,
  LEGACY_STORAGE_KEYS,
  LEGACY_USER_PROFILE_KEYS,
  STORAGE_KEYS,
} from "@/src/constants/storage-keys";

export interface UserProfile {
  id: string | number;
  email: string;
  name: string;
  role?: string;
  permissions?: string[];
}

export type AuthEvent = "login" | "logout" | "token-refresh" | "session-expired";
type AuthListener = (data?: unknown) => void;

export const AUTH_STATE_EVENT_NAME = "entraverse:auth-state";

class AuthEventEmitter {
  private static listeners = new Map<AuthEvent, Set<AuthListener>>();

  static on(event: AuthEvent, callback: AuthListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)?.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  static emit(event: AuthEvent, data?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Auth event listener error for ${event}:`, error);
      }
    });
  }

  static clear(): void {
    this.listeners.clear();
  }
}

const isStorageAvailable = (): boolean => typeof window !== "undefined";

const getStorages = (): Storage[] => {
  if (!isStorageAvailable()) return [];
  return [window.localStorage, window.sessionStorage];
};

const getStorageWithKey = (key: string): Storage | null => {
  return getStorages().find((storage) => storage.getItem(key) !== null) ?? null;
};

const readFromAnyStorage = (key: string): string | null => {
  return getStorages()
    .map((storage) => storage.getItem(key))
    .find((value): value is string => typeof value === "string") ?? null;
};

const removeFromAllStorages = (keys: readonly string[]): void => {
  getStorages().forEach((storage) => {
    keys.forEach((key) => storage.removeItem(key));
  });
};

const parseUserProfile = (profileJson: string): UserProfile | null => {
  const parsed = JSON.parse(profileJson) as Partial<UserProfile> | null;
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.id || !parsed.email || !parsed.name) return null;

  return {
    id: parsed.id,
    email: String(parsed.email),
    name: String(parsed.name),
    role: parsed.role ? String(parsed.role) : undefined,
    permissions: Array.isArray(parsed.permissions)
      ? parsed.permissions.map((permission) => String(permission))
      : undefined,
  };
};

const inferUserType = (profile: UserProfile): "admin" | "customer" => {
  return profile.role ? "admin" : "customer";
};

const resolveRefreshPayload = (payload: unknown): {
  token?: string;
  expiresIn?: number;
  refreshToken?: string;
} => {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const source = "data" in payload && payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : payload as Record<string, unknown>;

  return {
    token: typeof source.token === "string" ? source.token : undefined,
    expiresIn: typeof source.expires_in === "number" ? source.expires_in : undefined,
    refreshToken: typeof source.refresh_token === "string" ? source.refresh_token : undefined,
  };
};

export class TokenService {
  private static isClientSide(): boolean {
    return isStorageAvailable();
  }

  private static dispatchState(type: AuthEvent | "profile-updated" | "storage-cleared"): void {
    if (!this.isClientSide()) return;

    window.dispatchEvent(
      new CustomEvent(AUTH_STATE_EVENT_NAME, {
        detail: { type },
      })
    );
  }

  private static getPreferredStorage(rememberMe = this.getRememberMe()): Storage | null {
    if (!this.isClientSide()) return null;

    const tokenStorage = getStorageWithKey(STORAGE_KEYS.AUTH_TOKEN);
    if (tokenStorage) return tokenStorage;

    return rememberMe ? window.localStorage : window.sessionStorage;
  }

  private static getRememberMe(): boolean {
    if (!this.isClientSide()) return false;

    if (window.localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) !== null) {
      return window.localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === "true";
    }

    if (window.sessionStorage.getItem(STORAGE_KEYS.REMEMBER_ME) !== null) {
      return window.sessionStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === "true";
    }

    return false;
  }

  private static getFromStorage(key: string): string | null {
    if (!this.isClientSide()) return null;
    return readFromAnyStorage(key);
  }

  static setToken(
    token: string,
    rememberMe = false,
    expiresIn?: number,
    refreshToken?: string | null
  ): void {
    if (!this.isClientSide()) return;

    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;

    storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token.trim());
    storage.setItem(STORAGE_KEYS.REMEMBER_ME, String(rememberMe));
    storage.setItem(STORAGE_KEYS.LAST_AUTH_TIME, String(Date.now()));

    if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) {
      storage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(Date.now() + (expiresIn * 1000)));
    } else {
      storage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    }

    if (refreshToken) {
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } else if (refreshToken === null) {
      storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    otherStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    otherStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    otherStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    otherStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    otherStorage.removeItem(STORAGE_KEYS.LAST_AUTH_TIME);

    this.clearLegacyTokens();
    AuthEventEmitter.emit("login");
    this.dispatchState("login");
  }

  static setRefreshToken(refreshToken: string | null, rememberMe = this.getRememberMe()): void {
    if (!this.isClientSide()) return;

    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;

    if (refreshToken) {
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } else {
      storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    otherStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    this.dispatchState("profile-updated");
  }

  static getToken(): string | null {
    if (!this.isClientSide()) return null;

    const token = this.getFromStorage(STORAGE_KEYS.AUTH_TOKEN);
    return token ? token.trim() : null;
  }

  static getTokenExpiry(): number | null {
    const expiry = this.getFromStorage(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiry) return null;

    const parsed = Number.parseInt(expiry, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  static hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const expiry = this.getTokenExpiry();
    if (expiry !== null && Date.now() > expiry) {
      this.clearToken();
      this.clearUserProfile();
      AuthEventEmitter.emit("session-expired");
      this.dispatchState("session-expired");
      return false;
    }

    return true;
  }

  static clearToken(): void {
    if (!this.isClientSide()) return;

    removeFromAllStorages([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRY,
      STORAGE_KEYS.REMEMBER_ME,
      STORAGE_KEYS.LAST_AUTH_TIME,
    ]);

    this.clearLegacyTokens();
    this.dispatchState("storage-cleared");
  }

  static getRefreshToken(): string | null {
    return this.getFromStorage(STORAGE_KEYS.REFRESH_TOKEN);
  }

  static setUserProfile(profile: UserProfile): void {
    if (!this.isClientSide()) return;

    if (!profile.id || !profile.email || !profile.name) {
      throw new Error("Invalid profile data: missing required fields");
    }

    const storage = this.getPreferredStorage() ?? window.localStorage;
    const otherStorage = storage === window.localStorage ? window.sessionStorage : window.localStorage;

    storage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    storage.setItem(STORAGE_KEYS.USER_TYPE, inferUserType(profile));
    otherStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    otherStorage.removeItem(STORAGE_KEYS.USER_TYPE);

    this.dispatchState("profile-updated");
  }

  static getUserProfile(): UserProfile | null {
    if (!this.isClientSide()) return null;

    const profileJson = this.getFromStorage(STORAGE_KEYS.USER_PROFILE);
    if (!profileJson) return null;

    try {
      const parsed = parseUserProfile(profileJson);
      if (parsed) {
        return parsed;
      }

      console.error("Invalid profile data in storage");
      this.clearUserProfile();
      return null;
    } catch (error) {
      console.error("Failed to parse user profile:", error);
      this.clearUserProfile();
      return null;
    }
  }

  static async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    const refreshEndpoint = process.env.NEXT_PUBLIC_AUTH_REFRESH_ENDPOINT;

    if (!refreshToken || !refreshEndpoint) {
      return null;
    }

    try {
      const response = await fetch(refreshEndpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = resolveRefreshPayload(await response.json());
      if (!payload.token) {
        return null;
      }

      const rememberMe = this.getRememberMe();
      this.setToken(payload.token, rememberMe, payload.expiresIn, payload.refreshToken ?? refreshToken);
      AuthEventEmitter.emit("token-refresh");
      this.dispatchState("token-refresh");
      return payload.token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  }

  static getUserType(): "admin" | "customer" | null {
    if (!this.isClientSide()) return null;

    const userType = this.getFromStorage(STORAGE_KEYS.USER_TYPE);
    return userType === "admin" || userType === "customer" ? userType : null;
  }

  static logout(): void {
    this.clearToken();
    this.clearUserProfile();

    if (this.isClientSide()) {
      document.cookie.split(";").forEach((cookie) => {
        const separator = cookie.indexOf("=");
        const name = separator > -1 ? cookie.slice(0, separator).trim() : cookie.trim();
        if (name.toLowerCase().includes("xsrf") || name.toLowerCase().includes("csrf")) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    }

    AuthEventEmitter.emit("logout");
    this.dispatchState("logout");
  }

  static clearUserProfile(): void {
    if (!this.isClientSide()) return;

    removeFromAllStorages([STORAGE_KEYS.USER_PROFILE, STORAGE_KEYS.USER_TYPE]);
    this.dispatchState("profile-updated");
  }

  static on(event: AuthEvent, callback: AuthListener): () => void {
    return AuthEventEmitter.on(event, callback);
  }

  static migrateLegacyTokens(): void {
    if (!this.isClientSide()) return;

    for (const legacyKey of LEGACY_AUTH_TOKEN_KEYS) {
      const localLegacyToken = window.localStorage.getItem(legacyKey);
      if (localLegacyToken) {
        this.setToken(localLegacyToken, true);
        break;
      }

      const sessionLegacyToken = window.sessionStorage.getItem(legacyKey);
      if (sessionLegacyToken) {
        this.setToken(sessionLegacyToken, false);
        break;
      }
    }

    if (!this.getUserProfile()) {
      for (const legacyKey of LEGACY_USER_PROFILE_KEYS) {
        const legacyProfile = readFromAnyStorage(legacyKey);
        if (!legacyProfile) continue;

        try {
          const parsed = parseUserProfile(legacyProfile);
          if (parsed) {
            this.setUserProfile(parsed);
            break;
          }
        } catch (error) {
          console.error("Failed to migrate legacy user profile:", error);
        }
      }
    }

    this.clearLegacyTokens();
  }

  private static clearLegacyTokens(): void {
    if (!this.isClientSide()) return;

    removeFromAllStorages(LEGACY_STORAGE_KEYS);
  }

  static debugAuthState(): Record<string, unknown> {
    if (!this.isClientSide()) {
      return { error: "Not client-side" };
    }

    const tokenExpiry = this.getTokenExpiry();

    return {
      hasToken: this.hasValidToken(),
      tokenExpiry: tokenExpiry ? new Date(tokenExpiry).toISOString() : null,
      tokenMask: this.getToken() ? "***" : null,
      userProfile: this.getUserProfile(),
      userType: this.getUserType(),
      rememberMe: this.getRememberMe(),
    };
  }
}

export { AuthEventEmitter };
