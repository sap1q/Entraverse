"use client";

import { Upload } from "lucide-react";
import type { PhotoSlot } from "@/src/types/product";

type MediaSectionProps = {
  photos: PhotoSlot[];
  onPhotoChange: (slotIndex: number, file: File | null) => void;
};

export default function MediaSection({ photos, onPhotoChange }: MediaSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Foto Produk</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {photos.map((slot, index) => (
          <label
            key={index}
            className="relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 text-slate-500 transition hover:border-blue-400 hover:bg-blue-50"
          >
            {slot.preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slot.preview}
                  alt={`preview-${index}`}
                  className="h-full w-full rounded-lg object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition hover:opacity-100">
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700">
                    Ganti
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <Upload className="h-6 w-6 text-blue-500" />
                <span className="mt-2 text-xs font-medium">Unggah foto</span>
                <span className="mt-1 text-[10px] text-slate-400">Klik untuk browse</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onPhotoChange(index, event.target.files?.[0] ?? null)}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Unggah foto produk langsung dari perangkat Anda (maks. 5 foto).
      </p>
    </section>
  );
}
