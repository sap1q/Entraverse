"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { buildAuthLoginRedirect, getSessionRole } from "@/src/lib/auth/access";

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      const sessionRole = getSessionRole();

      if (sessionRole === "guest") {
        router.replace(buildAuthLoginRedirect(pathname || "/admin/dashboard"));
        return;
      }

      if (sessionRole !== "admin") {
        router.replace("/");
        return;
      }

      try {
        await authApi.getProfile();
      } catch {
        router.replace(buildAuthLoginRedirect(pathname || "/admin/dashboard"));
        return;
      } finally {
        setIsChecking(false);
      }
    };

    void run();
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
