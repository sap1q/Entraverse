import { STORAGE_KEYS } from "@/src/constants/storage-keys";
import { TokenService } from "@/src/lib/auth/tokens";

describe("TokenService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "XSRF-TOKEN=test-cookie";
    jest.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_AUTH_REFRESH_ENDPOINT;
  });

  describe("Token Management", () => {
    it("sets and gets a token", () => {
      TokenService.setToken("test_token_123", false);

      expect(TokenService.getToken()).toBe("test_token_123");
    });

    it("stores a token in localStorage when rememberMe=true", () => {
      TokenService.setToken("test_token_123", true);

      expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBe("test_token_123");
      expect(sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
    });

    it("stores a token in sessionStorage when rememberMe=false", () => {
      TokenService.setToken("test_token_123", false);

      expect(sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBe("test_token_123");
      expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
    });

    it("stores token expiry when expiresIn is provided", () => {
      TokenService.setToken("test_token", false, 3600);

      const expiry = TokenService.getTokenExpiry();

      expect(expiry).toBeTruthy();
      expect(expiry).toBeGreaterThan(Date.now());
    });

    it("returns true when the token exists and is not expired", () => {
      TokenService.setToken("test_token", false);

      expect(TokenService.hasValidToken()).toBe(true);
    });

    it("returns false when the token does not exist", () => {
      expect(TokenService.hasValidToken()).toBe(false);
    });

    it("invalidates expired tokens", () => {
      TokenService.setToken("test_token", false, -1);

      expect(TokenService.hasValidToken()).toBe(false);
      expect(TokenService.getToken()).toBeNull();
    });

    it("clears token state on logout", () => {
      TokenService.setToken("test_token", true);
      TokenService.logout();

      expect(TokenService.getToken()).toBeNull();
      expect(TokenService.hasValidToken()).toBe(false);
      expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
      expect(sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
    });
  });

  describe("User Profile Management", () => {
    it("sets and gets the user profile", () => {
      TokenService.setToken("token", false);
      TokenService.setUserProfile({
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: "admin",
      });

      const retrieved = TokenService.getUserProfile();

      expect(retrieved?.id).toBe(1);
      expect(retrieved?.email).toBe("test@example.com");
      expect(TokenService.getUserType()).toBe("admin");
    });

    it("throws on invalid profile data", () => {
      TokenService.setToken("token", false);

      expect(() => {
        TokenService.setUserProfile({ email: "test@example.com" } as never);
      }).toThrow("Invalid profile data");
    });

    it("handles corrupted storage data gracefully", () => {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, "invalid json{");

      expect(() => TokenService.getUserProfile()).not.toThrow();
      expect(TokenService.getUserProfile()).toBeNull();
    });

    it("clears the user profile on logout", () => {
      TokenService.setToken("token", false);
      TokenService.setUserProfile({
        id: 1,
        email: "test@example.com",
        name: "Test",
      });

      TokenService.logout();

      expect(TokenService.getUserProfile()).toBeNull();
      expect(TokenService.getUserType()).toBeNull();
    });
  });

  describe("Token Refresh", () => {
    it("returns the refresh token from storage", () => {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "refresh_123");
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, "true");

      expect(TokenService.getRefreshToken()).toBe("refresh_123");
    });

    it("refreshes the token when a refresh endpoint is configured", async () => {
      process.env.NEXT_PUBLIC_AUTH_REFRESH_ENDPOINT = "/api/auth/refresh";
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, "refresh_123");
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, "true");

      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "next_token",
          expires_in: 120,
          refresh_token: "refresh_456",
        }),
      } as Response);

      await expect(TokenService.refreshToken()).resolves.toBe("next_token");
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/refresh", expect.objectContaining({
        method: "POST",
      }));
      expect(TokenService.getToken()).toBe("next_token");
      expect(TokenService.getRefreshToken()).toBe("refresh_456");
    });
  });

  describe("Legacy Migration", () => {
    it("migrates legacy tokens", () => {
      localStorage.setItem("entraverse_admin_token", "legacy_token_123");

      TokenService.migrateLegacyTokens();

      expect(TokenService.getToken()).toBe("legacy_token_123");
      expect(localStorage.getItem("entraverse_admin_token")).toBeNull();
    });

    it("migrates the legacy admin profile cache", () => {
      localStorage.setItem(
        "entraverse_admin_user",
        JSON.stringify({ id: "1", email: "legacy@example.com", name: "Legacy Admin", role: "admin" })
      );

      TokenService.migrateLegacyTokens();

      expect(TokenService.getUserProfile()).toEqual({
        id: "1",
        email: "legacy@example.com",
        name: "Legacy Admin",
        role: "admin",
        permissions: undefined,
      });
    });
  });

  describe("Auth Events", () => {
    it("emits login on setToken", () => {
      const listener = jest.fn();
      const unsubscribe = TokenService.on("login", listener);

      TokenService.setToken("test_token", false);

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it("emits logout on logout", () => {
      TokenService.setToken("test_token", false);
      const listener = jest.fn();
      const unsubscribe = TokenService.on("logout", listener);

      TokenService.logout();

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe("Debug Helper", () => {
    it("returns the masked auth state", () => {
      TokenService.setToken("test_token", true);
      TokenService.setUserProfile({
        id: 1,
        email: "test@example.com",
        name: "Test",
      });

      const state = TokenService.debugAuthState();

      expect(state).toMatchObject({
        hasToken: true,
        tokenMask: "***",
        userType: "customer",
      });
    });
  });
});
