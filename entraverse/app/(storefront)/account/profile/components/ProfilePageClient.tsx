"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import type { Area } from "react-easy-crop";
import { AccountShell } from "@/app/(storefront)/account/components/AccountShell";
import { useAddress } from "@/hooks/useAddress";
import { useRequireStorefrontAuth } from "@/hooks/useRequireStorefrontAuth";
import { userProfileApi } from "@/lib/api/user-profile";
import type { UserProfile } from "@/lib/api/types/user-profile.types";
import {
  clearCachedProfileAvatar,
  fileToDataUrl,
  getCachedProfileAvatar,
  resolveApiAssetUrl,
  setCachedProfileAvatar,
} from "@/lib/utils/media";
import { getStoredAdmin, setStoredAdmin } from "@/lib/utils/storage";
import { AvatarCropModal } from "./AvatarCropModal";
import { ProfileForm } from "./ProfileForm";
import { cropAvatarImage } from "./cropAvatarImage";
import type { ProfileFormValues } from "./profileSchema";
import { profileSchema } from "./profileSchema";

const emptyValues: ProfileFormValues = {
  name: "",
  email: "",
  phone: "",
  gender: "",
  date_of_birth: "",
  avatar: null,
};

const toPhoneInputValue = (value: string | null | undefined): string => {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) return digits.slice(2);
  return digits.replace(/^0+/, "");
};

const getInitials = (name: string | null | undefined): string => {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "SA";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

const buildDefaultValues = (profile: UserProfile): ProfileFormValues => ({
  name: profile.name ?? "",
  email: profile.email ?? "",
  phone: toPhoneInputValue(profile.phone),
  gender: profile.gender ?? "",
  date_of_birth: profile.date_of_birth ?? "",
  avatar: null,
});

const isAbortError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  return error.code === "ERR_CANCELED";
};

type AvatarChangeMode = "keep" | "upload" | "remove";

export function ProfilePageClient() {
  const { isAuthenticated, isChecking } = useRequireStorefrontAuth("/account/profile");
  const { selectedAddress, fetchAddresses } = useAddress();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarChangeMode, setAvatarChangeMode] = useState<AvatarChangeMode>("keep");
  const [cropSource, setCropSource] = useState<{ src: string; fileName: string; fileType: string } | null>(null);
  const [isCroppingImage, setIsCroppingImage] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const cropSourceUrlRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: emptyValues,
  });

  const watchedName = watch("name");
  const avatarInitials = useMemo(() => getInitials(watchedName || profile?.name), [profile?.name, watchedName]);
  const canRemoveAvatar = Boolean(avatarPreview || profile?.avatar || profile?.avatar_path);

  const syncAvatarPreview = useCallback((nextAvatarPreview: string | null) => {
    setAvatarPreview(nextAvatarPreview);

    if (nextAvatarPreview) {
      setCachedProfileAvatar(nextAvatarPreview);
      return;
    }

    clearCachedProfileAvatar();
  }, []);

  const releasePreviewObjectUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const dispatchProfileUpdated = useCallback((detail: { name?: string | null; email?: string | null; avatar?: string | null }) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("storefront-profile-updated", {
        detail,
      })
    );
  }, []);

  useEffect(() => {
    return () => {
      releasePreviewObjectUrl();

      if (cropSourceUrlRef.current) {
        URL.revokeObjectURL(cropSourceUrlRef.current);
      }
    };
  }, [releasePreviewObjectUrl]);

  useEffect(() => {
    if (isChecking || !isAuthenticated) return;

    const controller = new AbortController();

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setFetchError(null);

      try {
        const nextProfile = await userProfileApi.getProfile(controller.signal);
        const resolvedAvatar = resolveApiAssetUrl(nextProfile.avatar);
        const persistedAvatarPreview = resolvedAvatar || getCachedProfileAvatar();
        setProfile(nextProfile);
        syncAvatarPreview(persistedAvatarPreview);
        setAvatarChangeMode("keep");
        reset(buildDefaultValues(nextProfile));
      } catch (error) {
        if (isAbortError(error)) return;
        setFetchError(error instanceof Error ? error.message : "Gagal memuat profil pengguna.");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void loadProfile();

    return () => {
      controller.abort();
    };
  }, [isAuthenticated, isChecking, reset, syncAvatarPreview]);

  useEffect(() => {
    if (!isAuthenticated || isChecking) return;
    void fetchAddresses({ force: true, silent: true });
  }, [fetchAddresses, isAuthenticated, isChecking]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    clearErrors("avatar");
    setStatusMessage(null);

    if (!file) {
      return;
    }

    const isSupportedType = ["image/jpeg", "image/png"].includes(file.type);
    if (!isSupportedType) {
      setError("avatar", { type: "manual", message: "Foto profil harus berformat JPG atau PNG." });
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("avatar", { type: "manual", message: "Ukuran foto profil maksimal 2 MB." });
      event.target.value = "";
      return;
    }

    if (cropSourceUrlRef.current) {
      URL.revokeObjectURL(cropSourceUrlRef.current);
    }

    const nextCropSourceUrl = URL.createObjectURL(file);
    cropSourceUrlRef.current = nextCropSourceUrl;
    setCropSource({
      src: nextCropSourceUrl,
      fileName: file.name,
      fileType: file.type,
    });

    event.target.value = "";
  };

  const handleCropCancel = () => {
    if (cropSourceUrlRef.current) {
      URL.revokeObjectURL(cropSourceUrlRef.current);
      cropSourceUrlRef.current = null;
    }

    setCropSource(null);
    setIsCroppingImage(false);
  };

  const handleCropConfirm = async (cropPixels: Area) => {
    if (!cropSource) return;

    setIsCroppingImage(true);

    try {
      const croppedFile = await cropAvatarImage(cropSource.src, cropPixels, cropSource.fileName, cropSource.fileType);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      const nextPreviewUrl = URL.createObjectURL(croppedFile);
      previewUrlRef.current = nextPreviewUrl;

      setValue("avatar", croppedFile, { shouldDirty: true, shouldValidate: false });
      setAvatarChangeMode("upload");
      setAvatarPreview(nextPreviewUrl);
      handleCropCancel();
    } catch (error) {
      setError("avatar", {
        type: "manual",
        message: error instanceof Error ? error.message : "Gagal memproses crop foto profil.",
      });
      setIsCroppingImage(false);
    }
  };

  const handleAvatarRemove = () => {
    const hasPersistedAvatar = Boolean(resolveApiAssetUrl(profile?.avatar) || profile?.avatar_path || getCachedProfileAvatar());

    clearErrors("avatar");
    setStatusMessage(null);
    releasePreviewObjectUrl();
    handleCropCancel();
    setValue("avatar", null, { shouldDirty: true, shouldValidate: false });
    setAvatarPreview(null);
    setAvatarChangeMode(hasPersistedAvatar ? "remove" : "keep");
  };

  const onSubmit = handleSubmit(async (values) => {
    setStatusMessage(null);
    const nextAvatarFile = values.avatar instanceof File ? values.avatar : null;
    const hasNewAvatar = Boolean(nextAvatarFile);
    const shouldRemoveAvatar = avatarChangeMode === "remove" && !hasNewAvatar;
    const localAvatarPreview = nextAvatarFile ? await fileToDataUrl(nextAvatarFile) : null;

    const formData = new FormData();
    formData.append("name", values.name.trim());
    formData.append("phone", values.phone.trim());
    formData.append("gender", values.gender);
    formData.append("date_of_birth", values.date_of_birth);

    if (nextAvatarFile) {
      formData.append("avatar", nextAvatarFile);
    }

    if (shouldRemoveAvatar) {
      formData.append("remove_avatar", "1");
    }

    try {
      const updatedProfile = await userProfileApi.updateProfile(formData);
      const resolvedApiAvatar = resolveApiAssetUrl(updatedProfile.avatar);
      const resolvedAvatarPreview = shouldRemoveAvatar
        ? null
        : resolvedApiAvatar || localAvatarPreview || avatarPreview || getCachedProfileAvatar() || null;

      setProfile(updatedProfile);
      syncAvatarPreview(resolvedAvatarPreview);
      setAvatarChangeMode("keep");
      reset(buildDefaultValues(updatedProfile));
      setStatusMessage({ type: "success", text: "Profil berhasil diperbarui." });

      const storedUser = getStoredAdmin();
      if (storedUser) {
        setStoredAdmin({
          ...storedUser,
          name: updatedProfile.name,
        });
      }

      dispatchProfileUpdated({
        name: updatedProfile.name,
        email: updatedProfile.email,
        avatar: resolvedAvatarPreview,
      });
      releasePreviewObjectUrl();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 422) {
        const responseErrors = error.response.data?.errors;

        Object.entries(responseErrors ?? {}).forEach(([field, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : undefined;
          if (!message) return;
          if (field === "name" || field === "email" || field === "phone" || field === "gender" || field === "date_of_birth" || field === "avatar") {
            setError(field, { type: "server", message });
          }
        });

        setStatusMessage({
          type: "error",
          text: typeof error.response.data?.message === "string" ? error.response.data.message : "Validasi profil gagal.",
        });
        return;
      }

      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Gagal memperbarui profil.",
      });
    }
  });

  if (isChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f3f6fb]">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
            Memeriksa sesi login...
          </div>
        </div>
      </div>
    );
  }

  const primaryAddress =
    selectedAddress?.full_address?.trim() ||
    "Belum ada alamat utama. Klik ikon pengaturan untuk menambahkan atau memilih alamat utama.";

  return (
    <AccountShell title="Biodata" description="Perbarui data diri, kontak, dan foto profil akun Entraverse Anda.">
      <AvatarCropModal
        key={cropSource?.src ?? "avatar-crop-closed"}
        imageSrc={cropSource?.src ?? null}
        open={Boolean(cropSource)}
        processing={isCroppingImage}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

      {isLoadingProfile && !profile ? (
        <div className="space-y-6">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-3xl bg-slate-100 lg:col-span-4" />
            ))}
          </div>
        </div>
      ) : (
        <ProfileForm
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          isLoadingProfile={isLoadingProfile}
          avatarPreview={avatarPreview}
          avatarInitials={avatarInitials}
          canRemoveAvatar={canRemoveAvatar}
          fetchError={fetchError}
          statusMessage={statusMessage}
          primaryAddress={primaryAddress}
          onAvatarChange={handleAvatarChange}
          onAvatarRemove={handleAvatarRemove}
          onSubmit={onSubmit}
        />
      )}
    </AccountShell>
  );
}
