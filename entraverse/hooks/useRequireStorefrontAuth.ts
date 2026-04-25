"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { userProfileApi } from "@/lib/api/user-profile";
import { clearPersistedAuth } from "@/lib/axios";
import { AUTH_STATE_EVENT_NAME } from "@/src/lib/auth/tokens";
import { buildStorefrontLoginRedirect, getSessionRole, type SessionRole } from "@/src/lib/auth/access";

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
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);

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

    if (sessionRole !== "customer") {
      return;
    }

    let isCancelled = false;
    const verifyCustomerSession = async () => {
      setIsVerifyingSession(true);

      try {
        await userProfileApi.getProfile();
        if (isCancelled) return;
        setIsVerifyingSession(false);
      } catch {
        if (isCancelled) return;
        clearPersistedAuth();
        setSessionRole("guest");
        setIsVerifyingSession(false);
      }
    };

    void verifyCustomerSession();

    return () => {
      isCancelled = true;
    };
  }, [hasHydrated, sessionRole]);

  useEffect(() => {
    if (!hasHydrated || isVerifyingSession) return;

    const nextQuery = searchParams.toString();
    const nextPath = redirectPath ?? `${pathname}${nextQuery ? `?${nextQuery}` : ""}`;

    if (sessionRole === "guest") {
      router.replace(buildStorefrontLoginRedirect(nextPath));
    }
  }, [hasHydrated, isVerifyingSession, pathname, redirectPath, router, searchParams, sessionRole]);

  return {
    isAuthenticated: hasHydrated && !isVerifyingSession && sessionRole !== "guest",
    isChecking: !hasHydrated || isVerifyingSession || sessionRole === "guest",
    sessionRole,
  };
};
