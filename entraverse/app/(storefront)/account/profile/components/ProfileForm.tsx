"use client";

import type { ChangeEvent } from "react";
import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldShell, ProfileSelect, ProfileTextInput } from "./ProfileFields";
import { ProfileAvatarPicker } from "./ProfileAvatarPicker";
import type { ProfileFormValues } from "./profileSchema";

interface ProfileFormProps {
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
  isSubmitting: boolean;
  isLoadingProfile: boolean;
  avatarPreview: string | null;
  avatarInitials: string;
  canRemoveAvatar: boolean;
  fetchError: string | null;
  statusMessage: { type: "success" | "error"; text: string } | null;
  primaryAddress: string;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarRemove: () => void;
  onSubmit: ReturnType<UseFormHandleSubmit<ProfileFormValues>>;
}

const getErrorMessage = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

export function ProfileForm({
  register,
  errors,
  isSubmitting,
  isLoadingProfile,
  avatarPreview,
  avatarInitials,
  canRemoveAvatar,
  fetchError,
  statusMessage,
  primaryAddress,
  onAvatarChange,
  onAvatarRemove,
  onSubmit,
}: ProfileFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {fetchError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{fetchError}</div>
      ) : null}

      {statusMessage ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {statusMessage.text}
        </div>
      ) : null}

      <ProfileAvatarPicker
        previewUrl={avatarPreview}
        initials={avatarInitials}
        error={getErrorMessage(errors.avatar?.message)}
        disabled={isSubmitting || isLoadingProfile}
        canRemove={canRemoveAvatar}
        onChange={onAvatarChange}
        onRemove={onAvatarRemove}
      />

      <div>
        <h2 className="text-xl font-bold text-slate-900">Informasi Personal</h2>
        <p className="mt-1 text-sm text-slate-500">Form dirancang lebih ringkas agar nyaman dipakai tanpa scroll berlebih.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <FieldShell label="Nama Lengkap" htmlFor="name" error={getErrorMessage(errors.name?.message)}>
            <ProfileTextInput
              id="name"
              placeholder="Masukkan nama lengkap"
              disabled={isLoadingProfile || isSubmitting}
              {...register("name")}
            />
          </FieldShell>
        </div>

        <div className="lg:col-span-6">
          <FieldShell
            label="Alamat Email"
            htmlFor="email"
            error={getErrorMessage(errors.email?.message)}
            helperText="Email mengikuti akun login dan tidak bisa diubah dari halaman ini."
          >
            <ProfileTextInput
              id="email"
              placeholder="Alamat email"
              readOnly
              disabled={isLoadingProfile || isSubmitting}
              className="border-slate-200 bg-slate-100 text-slate-500"
              {...register("email")}
            />
          </FieldShell>
        </div>

        <div className="lg:col-span-4">
          <FieldShell label="No. Telepon" htmlFor="phone" error={getErrorMessage(errors.phone?.message)}>
            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
              <span className="inline-flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500">
                +62
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="81234567890"
                disabled={isLoadingProfile || isSubmitting}
                className="w-full px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                {...register("phone")}
              />
            </div>
          </FieldShell>
        </div>

        <div className="lg:col-span-4">
          <FieldShell label="Jenis Kelamin" htmlFor="gender" error={getErrorMessage(errors.gender?.message)}>
            <ProfileSelect id="gender" disabled={isLoadingProfile || isSubmitting} {...register("gender")}>
              <option value="">Pilih jenis kelamin</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
              <option value="other">Lainnya</option>
            </ProfileSelect>
          </FieldShell>
        </div>

        <div className="lg:col-span-4">
          <FieldShell
            label="Tanggal Lahir"
            htmlFor="date_of_birth"
            error={getErrorMessage(errors.date_of_birth?.message)}
          >
            <ProfileTextInput
              id="date_of_birth"
              type="date"
              disabled={isLoadingProfile || isSubmitting}
              {...register("date_of_birth")}
            />
          </FieldShell>
        </div>

        <div className="lg:col-span-8">
          <FieldShell label="Alamat Utama" htmlFor="primary-address">
            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div
                id="primary-address"
                className="min-h-[54px] flex-1 px-4 py-3 text-sm leading-6 text-slate-600"
              >
                {primaryAddress}
              </div>
              <Link
                href="/account/addresses"
                aria-label="Kelola alamat"
                className="inline-flex w-14 items-center justify-center border-l border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
              >
                <Settings2 className="h-4 w-4" />
              </Link>
            </div>
          </FieldShell>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Perubahan biodata akan langsung tersimpan ke akun Anda setelah request berhasil.</p>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting || isLoadingProfile}
          className="h-12 rounded-2xl bg-blue-600 px-6 hover:bg-blue-700"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}
