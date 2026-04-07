"use client";

import type { ChangeEvent } from "react";

interface ProfileAvatarPickerProps {
  previewUrl: string | null;
  initials: string;
  error?: string;
  disabled?: boolean;
  canRemove?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export function ProfileAvatarPicker({
  previewUrl,
  initials,
  error,
  disabled = false,
  canRemove = false,
  onChange,
  onRemove,
}: ProfileAvatarPickerProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-lg font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview foto profil" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Foto Profil</p>
            <p className="text-xs text-slate-500">Maksimal 2 MB | JPG, PNG</p>
            {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="avatar"
            className={`inline-flex h-11 cursor-pointer items-center rounded-2xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 ${
              disabled ? "pointer-events-none opacity-60" : ""
            }`}
          >
            Upload Foto
          </label>
          <button
            type="button"
            className={`inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 ${
              disabled || !canRemove ? "pointer-events-none opacity-60" : ""
            }`}
            disabled={disabled || !canRemove}
            onClick={onRemove}
          >
            Hapus Foto
          </button>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="sr-only"
            disabled={disabled}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  );
}
