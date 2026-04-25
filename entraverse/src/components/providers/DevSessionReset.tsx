"use client";

import { useEffect } from "react";
import { clearPersistedAuth } from "@/lib/axios";
import {
  ADMIN_SESSION_ENDPOINTS,
  ADMIN_SESSION_HINT_COOKIE,
  CUSTOMER_SESSION_ENDPOINTS,
} from "@/src/constants/auth-cookies";

const DEV_BOOT_STORAGE_KEY = "entraverse_dev_server_boot_id";
const DEV_RESET_DONE_PREFIX = "entraverse_dev_auth_reset_done:";
const CLIENT_CLEARABLE_COOKIE_NAMES = [
  ADMIN_SESSION_HINT_COOKIE,
  "XSRF-TOKEN",
  "laravel_session",
] as const;

const clearClientCookies = () => {
  CLIENT_CLEARABLE_COOKIE_NAMES.forEach((cookieName) => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=127.0.0.1`;
  });
};

const postJson = async (url: string) => {
  await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    cache: "no-store",
  });
};

export function DevSessionReset({ bootId }: { bootId: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const previousBootId = window.localStorage.getItem(DEV_BOOT_STORAGE_KEY);
    const resetDoneKey = `${DEV_RESET_DONE_PREFIX}${bootId}`;
    const resetAlreadyDone = window.sessionStorage.getItem(resetDoneKey) === "true";

    if (previousBootId === bootId || resetAlreadyDone) {
      window.localStorage.setItem(DEV_BOOT_STORAGE_KEY, bootId);
      return;
    }

    window.localStorage.setItem(DEV_BOOT_STORAGE_KEY, bootId);
    window.sessionStorage.setItem(resetDoneKey, "true");

    clearPersistedAuth();
    clearClientCookies();

    void (async () => {
      try {
        await postJson(ADMIN_SESSION_ENDPOINTS.logout);
      } catch {
        document.cookie = `${ADMIN_SESSION_HINT_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }

      try {
        await fetch(CUSTOMER_SESSION_ENDPOINTS.csrfCookie, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          cache: "no-store",
        });
      } catch {
        // Ignore CSRF bootstrap failures; we still clear client state below.
      }

      try {
        await postJson(CUSTOMER_SESSION_ENDPOINTS.logout);
      } catch {
        // Ignore logout failures; stale client state has already been cleared.
      } finally {
        clearPersistedAuth();
        clearClientCookies();
      }
    })();
  }, [bootId]);

  return null;
}
