/**
 * Centralized storage keys for auth and cached user state.
 * This keeps token persistence and profile caching on one namespace.
 */

export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  TOKEN_EXPIRY: "auth_token_expiry",
  USER_PROFILE: "user_profile",
  USER_TYPE: "user_type",
  LAST_AUTH_TIME: "last_auth_time",
  REMEMBER_ME: "remember_me",
} as const;

export const LEGACY_STORAGE_KEYS = [
  "entraverse_admin_token",
  "entraverse_admin_user",
  "token",
  "admin_token",
] as const;

export const LEGACY_AUTH_TOKEN_KEYS = [
  "entraverse_admin_token",
  "token",
  "admin_token",
] as const;

export const LEGACY_USER_PROFILE_KEYS = [
  "entraverse_admin_user",
] as const;
