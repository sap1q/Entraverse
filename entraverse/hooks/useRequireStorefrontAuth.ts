"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AUTH_STATE_EVENT_NAME } from "@/src/lib/auth/tokens";
import { buildAuthLoginRedirect, getSessionRole, type SessionRole } from "@/src/lib/auth/access";

type RequireAuthResult = {
  isAuthenticated: boolean;
  isChecking: boolean;
  sessionRole: SessionRole;
};

export const useRequireStorefrontAuth = (redirectPath?: string): RequireAuthResult => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessionRole, setSessionRole] = useState<SessionRole>("guest");
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const syncSessionRole = () => {
      setSessionRole(getSessionRole());
      setHasHydrated(true);
    };

    syncSessionRole();

    window.addEventListener("storage", syncSessionRole);
    window.addEventListener(AUTH_STATE_EVENT_NAME, syncSessionRole as EventListener);

    return () => {
      window.removeEventListener("storage", syncSessionRole);
      window.removeEventListener(AUTH_STATE_EVENT_NAME, syncSessionRole as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const nextQuery = searchParams.toString();
    const nextPath = redirectPath ?? `${pathname}${nextQuery ? `?${nextQuery}` : ""}`;

    if (sessionRole === "guest") {
      router.replace(buildAuthLoginRedirect(nextPath));
    }
  }, [hasHydrated, pathname, redirectPath, router, searchParams, sessionRole]);

  return {
    isAuthenticated: hasHydrated && sessionRole !== "guest",
    isChecking: !hasHydrated || sessionRole === "guest",
    sessionRole,
  };
};
