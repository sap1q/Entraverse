"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { userProfileApi } from "@/lib/api/user-profile";
import { clearPersistedAuth } from "@/lib/axios";
import { getCachedProfileAvatar, getNameInitials, resolveApiAssetUrl } from "@/lib/utils/media";
import { getStoredAdmin, getToken } from "@/lib/utils/storage";
import { ProfileDropdown } from "@/src/components/layout/ProfileDropdown";
import { AUTH_STATE_EVENT_NAME } from "@/src/lib/auth/tokens";

type ProfileShortcutSnapshot = {
  isLoggedIn: boolean;
  name: string | null;
  email: string | null;
  role: string | null;
};

type ProfileShortcutDetails = {
  subjectKey: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type StorefrontProfileUpdatedDetail = {
  avatar?: string | null;
  name?: string | null;
  email?: string | null;
};

const serverProfileShortcutSnapshot: ProfileShortcutSnapshot = {
  isLoggedIn: false,
  name: null,
  email: null,
  role: null,
};

let cachedProfileShortcutSnapshot: ProfileShortcutSnapshot = serverProfileShortcutSnapshot;

const getProfileShortcutServerSnapshot = (): ProfileShortcutSnapshot => serverProfileShortcutSnapshot;

const getProfileShortcutSnapshot = (): ProfileShortcutSnapshot => {
  const storedAdmin = getStoredAdmin();
  const nextSnapshot: ProfileShortcutSnapshot = {
    isLoggedIn: Boolean(getToken()),
    name: storedAdmin?.name ?? null,
    email: storedAdmin?.email ?? null,
    role: storedAdmin?.role ?? null,
  };

  if (
    cachedProfileShortcutSnapshot.isLoggedIn === nextSnapshot.isLoggedIn &&
    cachedProfileShortcutSnapshot.name === nextSnapshot.name &&
    cachedProfileShortcutSnapshot.email === nextSnapshot.email &&
    cachedProfileShortcutSnapshot.role === nextSnapshot.role
  ) {
    return cachedProfileShortcutSnapshot;
  }

  cachedProfileShortcutSnapshot = nextSnapshot;
  return cachedProfileShortcutSnapshot;
};

const subscribeProfileShortcut = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const notify = () => callback();

  window.addEventListener("storage", notify);
  window.addEventListener("storefront-profile-updated", notify as EventListener);
  window.addEventListener(AUTH_STATE_EVENT_NAME, notify as EventListener);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("storefront-profile-updated", notify as EventListener);
    window.removeEventListener(AUTH_STATE_EVENT_NAME, notify as EventListener);
  };
};

type ProfileShortcutProps = {
  variant?: "default" | "overlay";
};

export function ProfileShortcut({ variant = "default" }: ProfileShortcutProps) {
  const router = useRouter();
  const profileSnapshot = useSyncExternalStore(
    subscribeProfileShortcut,
    getProfileShortcutSnapshot,
    getProfileShortcutServerSnapshot
  );

  const [profileDetails, setProfileDetails] = useState<ProfileShortcutDetails | null>(null);
  const subjectKey = profileSnapshot.isLoggedIn
    ? `${profileSnapshot.role ?? "customer"}:${profileSnapshot.email ?? profileSnapshot.name ?? "user"}`
    : "guest";
  const activeProfileDetails = profileDetails?.subjectKey === subjectKey ? profileDetails : null;

  useEffect(() => {
    if (!profileSnapshot.isLoggedIn) return;

    const controller = new AbortController();
    const currentSubjectKey = subjectKey;

    const loadProfile = async () => {
      try {
        const profile = await userProfileApi.getProfile(controller.signal);
        const resolvedAvatar = resolveApiAssetUrl(profile.avatar);
        setProfileDetails({
          subjectKey: currentSubjectKey,
          name: profile.name ?? profileSnapshot.name,
          email: profile.email ?? profileSnapshot.email,
          avatarUrl: resolvedAvatar || getCachedProfileAvatar(),
        });
      } catch {
        setProfileDetails((current) => ({
          subjectKey: currentSubjectKey,
          name: profileSnapshot.name ?? current?.name ?? null,
          email: profileSnapshot.email ?? current?.email ?? null,
          avatarUrl: getCachedProfileAvatar() ?? current?.avatarUrl ?? null,
        }));
      }
    };

    void loadProfile();

    const handleProfileUpdated = (event: Event) => {
      const detail = ((event as CustomEvent<StorefrontProfileUpdatedDetail>).detail ?? {}) as StorefrontProfileUpdatedDetail;
      const cachedAvatar = getCachedProfileAvatar();
      const hasAvatarInDetail = Object.prototype.hasOwnProperty.call(detail, "avatar");

      setProfileDetails((current) => ({
        subjectKey: currentSubjectKey,
        name: detail?.name ?? profileSnapshot.name ?? current?.name ?? null,
        email: detail?.email ?? profileSnapshot.email ?? current?.email ?? null,
        avatarUrl: hasAvatarInDetail
          ? cachedAvatar || resolveApiAssetUrl(detail.avatar) || null
          : cachedAvatar || current?.avatarUrl || null,
      }));
    };

    window.addEventListener("storefront-profile-updated", handleProfileUpdated as EventListener);

    return () => {
      controller.abort();
      window.removeEventListener("storefront-profile-updated", handleProfileUpdated as EventListener);
    };
  }, [profileSnapshot.email, profileSnapshot.isLoggedIn, profileSnapshot.name, subjectKey]);

  const canAccessAdminPanel =
    profileSnapshot.role === "superadmin" || profileSnapshot.role === "admin";

  const handleLogout = () => {
    clearPersistedAuth();
    router.push("/");
    router.refresh();
  };

  const displayName = activeProfileDetails?.name ?? profileSnapshot.name ?? "Godzilla D. White";
  const displayEmail = activeProfileDetails?.email ?? profileSnapshot.email ?? "user@example.com";

  return (
    <ProfileDropdown
      variant={variant}
      isLoggedIn={profileSnapshot.isLoggedIn}
      user={{
        name: displayName,
        email: displayEmail,
        avatarUrl: profileSnapshot.isLoggedIn
          ? activeProfileDetails?.avatarUrl ?? getCachedProfileAvatar()
          : null,
        initials: getNameInitials(displayName, profileSnapshot.isLoggedIn ? "U" : "G"),
        isOnline: profileSnapshot.isLoggedIn,
      }}
      onLogout={handleLogout}
      guestRegisterHref="/auth/register"
      guestLoginHref="/auth/login"
      accountHref="/account/profile"
      addressHref="/account/addresses"
      ordersHref="/transaksi"
      wishlistHref="/account/wishlist"
      adminDashboardHref={canAccessAdminPanel ? "/admin/dashboard" : null}
    />
  );
}
