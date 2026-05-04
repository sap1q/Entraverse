"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import type { PhotoSlot } from "@/types/product";
import { PRODUCT_MEDIA_MAX_PHOTOS, isInvalidPhotoValue } from "@/lib/product-media";
import { resolveApiOriginUrl } from "@/lib/api-config";

type MediaUploadProps = {
  photos: PhotoSlot[];
  imageErrors: string[];
  handleImageChange: (slotIndex: number, file: File | null) => void;
  handleBulkImageChange: (slotIndex: number, files: File[]) => void;
  handleRemoveImage: (slotIndex: number) => void;
};

type ResolvedPhoto = {
  index: number;
  preview: string;
};

const buildImageCandidates = (source: string): string[] => {
  const value = source.trim();
  if (!value || isInvalidPhotoValue(value)) return [];

  const unique = new Set<string>();
  const push = (url: string) => {
    const normalized = url.trim();
    if (!normalized) return;
    unique.add(normalized);
  };

  if (/^(blob:|data:|https?:\/\/)/i.test(value)) {
    push(value);
    return Array.from(unique);
  }

  if (/^api\/v1\/products\/image\//i.test(value)) {
    push(resolveApiOriginUrl(`/${value}`));
    push(`/${value}`);
    return Array.from(unique);
  }

  if (value.startsWith("/")) {
    push(resolveApiOriginUrl(value));
    push(value);
    return Array.from(unique);
  }

  if (/^(storage\/products\/|products\/)/i.test(value)) {
    const relativePath = value.replace(/^storage\//i, "");
    push(resolveApiOriginUrl(`/api/v1/products/image/${relativePath}`));
  }

  push(resolveApiOriginUrl(`/${value}`));
  push(value.startsWith("/") ? value : `/${value}`);

  return Array.from(unique);
};

export default function MediaUpload({
  photos,
  imageErrors,
  handleImageChange,
  handleBulkImageChange,
  handleRemoveImage,
}: MediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeCandidateBySlot, setActiveCandidateBySlot] = useState<Record<string, number>>({});
  const [uploadTargetIndex, setUploadTargetIndex] = useState(0);
  const resolvedSlots = useMemo<ResolvedPhoto[]>(
    () =>
      Array.from({ length: PRODUCT_MEDIA_MAX_PHOTOS }, (_, index) => {
        const rawPreview = photos[index]?.preview ?? "";
        const preview = rawPreview.trim();
        return { index, preview };
      }),
    [photos]
  );
  const canUpload = true;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Media Upload</h2>
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: PRODUCT_MEDIA_MAX_PHOTOS }).map((_, index) => {
          const slot = resolvedSlots[index];
          const hasPreview = !isInvalidPhotoValue(slot.preview);
          const isMainPhoto = index === 0;
          const slotKey = `${index}:${slot.preview}`;
          const candidates = buildImageCandidates(slot.preview);
          const activeCandidate = activeCandidateBySlot[slotKey] ?? 0;
          const imageSrc = candidates[activeCandidate] ?? "";
          const hasImage = hasPreview && imageSrc.length > 0;
          const canUploadThisSlot = !hasImage && canUpload;

          return (
            <div key={index} className="space-y-2">
              <div
                className={`relative isolate z-0 flex aspect-square items-center justify-center overflow-hidden rounded-2xl border-2 bg-slate-50 transition ${
                  hasImage
                    ? isMainPhoto
                      ? "border-blue-300"
                      : "border-slate-200"
                    : canUploadThisSlot
                      ? "cursor-pointer border-dashed border-blue-300 hover:border-blue-500"
                      : "border-dashed border-slate-300"
                }`}
                onClick={() => {
                  if (!canUploadThisSlot) return;
                  setUploadTargetIndex(index);
                  fileInputRef.current?.click();
                }}
              >
                {isMainPhoto ? (
                  <span className="absolute left-2 top-2 z-10 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    FOTO UTAMA
                  </span>
                ) : null}

                {hasImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt={`preview-${index}`}
                      className="h-full w-full object-cover"
                      onError={() => {
                        setActiveCandidateBySlot((prev) => {
                          const current = prev[slotKey] ?? 0;
                          if (current >= candidates.length - 1) return { ...prev, [slotKey]: candidates.length };
                          return { ...prev, [slotKey]: current + 1 };
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveImage(index);
                      }}
                      className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : canUploadThisSlot ? (
                  <div className="flex flex-col items-center justify-center px-3 text-center text-slate-500">
                    <Upload className="h-5 w-5" />
                    <span className="mt-2 text-xs font-semibold">Upload</span>
                  </div>
                ) : (
                  <div className="h-full w-full bg-slate-50" />
                )}
              </div>
              {imageErrors[index] ? (
                <p className="text-[11px] text-rose-600">{imageErrors[index]}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          if (files.length === 1) {
            handleImageChange(uploadTargetIndex, files[0] ?? null);
          } else if (files.length > 1) {
            handleBulkImageChange(uploadTargetIndex, files);
          }
          event.currentTarget.value = "";
        }}
      />
      <p className="text-xs text-slate-500">Unggah hingga 5 foto. Bisa pilih beberapa file sekaligus. Maksimal ukuran tiap file 2MB.</p>
    </section>
  );
}
