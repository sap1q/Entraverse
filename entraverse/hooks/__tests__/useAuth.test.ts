import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { clearPersistedAuth, persistAuthToken } from "@/lib/axios";
import { authApi } from "@/lib/api/auth";
import { TokenService } from "@/src/lib/auth/tokens";

jest.mock("@/lib/axios", () => ({
  clearPersistedAuth: jest.fn(),
  persistAuthToken: jest.fn(),
}));

jest.mock("@/lib/api/auth", () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  },
}));

jest.mock("@/src/lib/auth/tokens", () => ({
  TokenService: {
    getToken: jest.fn(),
    getUserProfile: jest.fn(),
    getUserType: jest.fn(),
    hasValidToken: jest.fn(),
    migrateLegacyTokens: jest.fn(),
    setUserProfile: jest.fn(),
    on: jest.fn(() => jest.fn()),
  },
}));

const mockedPersistAuthToken = jest.mocked(persistAuthToken);
const mockedClearPersistedAuth = jest.mocked(clearPersistedAuth);
const mockedAuthApi = jest.mocked(authApi);
const mockedTokenService = jest.mocked(TokenService);

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTokenService.getToken.mockReturnValue(null);
    mockedTokenService.getUserProfile.mockReturnValue(null);
    mockedTokenService.getUserType.mockReturnValue(null);
    mockedTokenService.hasValidToken.mockReturnValue(false);
  });

  it("initializes with no auth state", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.admin).toBeNull();
  });

  it("initializes with an existing admin session", () => {
    const profile = { id: "1", email: "test@example.com", name: "Admin", role: "admin" };
    mockedTokenService.getUserType.mockReturnValue("admin");
    mockedTokenService.getUserProfile.mockReturnValue(profile);
    mockedTokenService.hasValidToken.mockReturnValue(true);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.admin).toEqual(profile);
  });

  it("handles successful login", async () => {
    mockedAuthApi.login.mockResolvedValue({
      success: true,
      message: "ok",
      data: {
        token: "new_token",
        admin: { id: "1", email: "user@example.com", name: "User", role: "admin" },
        token_type: "Bearer",
        expires_in: 300,
      },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({
        email: "user@example.com",
        password: "password123",
        remember: false,
      });
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(mockedPersistAuthToken).toHaveBeenCalledWith("new_token", false, 300, undefined);
    expect(mockedTokenService.setUserProfile).toHaveBeenCalledWith({
      id: "1",
      email: "user@example.com",
      name: "User",
      role: "admin",
    });
  });

  it("handles logout", async () => {
    mockedTokenService.getUserType.mockReturnValue("admin");
    mockedTokenService.getUserProfile.mockReturnValue({
      id: "1",
      email: "test@example.com",
      name: "Test",
      role: "admin",
    });
    mockedTokenService.hasValidToken.mockReturnValue(true);
    mockedAuthApi.logout.mockResolvedValue({
      success: true,
      message: "ok",
      data: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedClearPersistedAuth).toHaveBeenCalled();
  });

  it("validates email format", () => {
    const { result } = renderHook(() => useAuth());

    const errors = result.current.validateLogin({
      email: "invalid-email",
      password: "password123",
    });

    expect(errors.email).toBeDefined();
    expect(errors.email?.length).toBeGreaterThan(0);
  });
});
