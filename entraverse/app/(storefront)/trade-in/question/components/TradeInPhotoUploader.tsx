"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ImagePlus, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const TRADE_IN_PHOTO_SLOTS = [
  {
    id: "front",
    title: "Depan perangkat",
    hint: "Ambil seluruh area depan dengan cahaya terang.",
    required: true,
  },
  {
    id: "back",
    title: "Belakang perangkat",
    hint: "Pastikan body belakang terlihat penuh dan tajam.",
    required: true,
  },
  {
    id: "screen_on",
    title: "Perangkat menyala",
    hint: "Tampilkan layar home/menu untuk bukti perangkat hidup.",
    required: true,
  },
  {
    id: "damage_detail",
    title: "Detail goresan",
    hint: "Upload close-up bila ada baret, dent, atau retak.",
    required: false,
  },
  {
    id: "accessories",
    title: "Kelengkapan",
    hint: "Foto box, charger, kabel, atau aksesoris yang masih ada.",
    required: false,
  },
] as const;

export type TradeInPhotoSlotId = (typeof TRADE_IN_PHOTO_SLOTS)[number]["id"];

export type TradeInPhotoItem = {
  id: string;
  slotId: TradeInPhotoSlotId;
  file: File;
  previewUrl: string;
};

interface TradeInPhotoUploaderProps {
  photos: TradeInPhotoItem[];
  onChange: (photos: TradeInPhotoItem[]) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const REQUIRED_SLOT_IDS = TRADE_IN_PHOTO_SLOTS.filter((slot) => slot.required).map((slot) => slot.id);

const isAcceptedImage = (file: File) => ["image/jpeg", "image/png"].includes(file.type);

export const countUploadedRequiredSlots = (photos: TradeInPhotoItem[]): number => {
  return REQUIRED_SLOT_IDS.filter((slotId) => photos.some((photo) => photo.slotId === slotId)).length;
};

export const getRequiredTradeInPhotoSlotCount = (): number => REQUIRED_SLOT_IDS.length;

export function TradeInPhotoUploader({ photos, onChange }: TradeInPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeSlotIdRef = useRef<TradeInPhotoSlotId | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<TradeInPhotoSlotId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuidance, setShowGuidance] = useState(true);

  const uploadedRequiredCount = useMemo(() => countUploadedRequiredSlots(photos), [photos]);

  const helperText = useMemo(() => {
    if (error) return error;
    return `${uploadedRequiredCount}/${REQUIRED_SLOT_IDS.length} foto wajib sudah lengkap. Tambahkan foto detail kerusakan bila perlu.`;
  }, [error, uploadedRequiredCount]);

  const replaceSlotPhoto = (slotId: TradeInPhotoSlotId, file: File) => {
    const nextPhoto: TradeInPhotoItem = {
      id: `${slotId}-${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      slotId,
      file,
      previewUrl: URL.createObjectURL(file),
    };

    const nextPhotos = [
      ...photos.filter((photo) => photo.slotId !== slotId),
      nextPhoto,
    ];

    onChange(nextPhotos);
  };

  const appendFileToSlot = (slotId: TradeInPhotoSlotId, file: File | null) => {
    if (!file) return;

    if (!isAcceptedImage(file)) {
      setError("Format file harus JPG atau PNG.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran file melebihi 10MB.");
      return;
    }

    setError(null);
    replaceSlotPhoto(slotId, file);
  };

  const handlePickSlot = (slotId: TradeInPhotoSlotId) => {
    activeSlotIdRef.current = slotId;
    inputRef.current?.click();
  };

  const removePhoto = (slotId: TradeInPhotoSlotId) => {
    onChange(photos.filter((photo) => photo.slotId !== slotId));
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_-38px_rgba(15,23,42,0.45)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">Unggah foto perangkat lama</p>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan slot foto di bawah agar tim verifikasi lebih cepat menilai kondisi perangkat.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          JPG, PNG
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          const activeSlotId = activeSlotIdRef.current;
          appendFileToSlot(activeSlotId ?? "front", event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      <div className="mt-5 rounded-[24px] border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Saran verifikasi foto</p>
          <button
            type="button"
            onClick={() => setShowGuidance((current) => !current)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-white text-base font-semibold text-blue-700 transition hover:bg-blue-100"
            aria-expanded={showGuidance}
            aria-label={showGuidance ? "Sembunyikan saran verifikasi foto" : "Tampilkan saran verifikasi foto"}
          >
            {showGuidance ? "−" : "+"}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {showGuidance ? (
            <motion.div
              key="photo-guidance"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  Gunakan cahaya terang dan hindari foto blur.
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  Pastikan body terlihat penuh, bukan crop terlalu dekat.
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  Tampilkan layar menyala untuk bukti perangkat masih hidup.
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  Tambahkan close-up area cacat agar limit lebih akurat.
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <p className={cn("mt-4 text-sm", error ? "text-rose-600" : "text-slate-500")}>{helperText}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TRADE_IN_PHOTO_SLOTS.map((slot) => {
          const slotPhoto = photos.find((photo) => photo.slotId === slot.id) ?? null;
          const isDragging = hoveredSlotId === slot.id;

          return (
            <motion.div
              key={slot.id}
              whileTap={{ scale: 0.99 }}
              role="button"
              tabIndex={0}
              onClick={() => handlePickSlot(slot.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handlePickSlot(slot.id);
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setHoveredSlotId(slot.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setHoveredSlotId(slot.id);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setHoveredSlotId((current) => (current === slot.id ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setHoveredSlotId((current) => (current === slot.id ? null : current));
                appendFileToSlot(slot.id, event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "group relative overflow-hidden rounded-[24px] border p-4 text-left transition",
                slotPhoto
                  ? "border-blue-200 bg-white shadow-[0_14px_38px_-32px_rgba(37,99,235,0.4)]"
                  : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white",
                isDragging && "border-blue-500 bg-blue-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{slot.title}</p>
                    {slot.required ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                        Wajib
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        Opsional
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{slot.hint}</p>
                </div>

                {slotPhoto ? (
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                ) : null}
              </div>

              <div className="mt-4 overflow-hidden rounded-[20px] border border-dashed border-slate-300 bg-white">
                {slotPhoto ? (
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={slotPhoto.previewUrl}
                      alt={`Preview ${slot.title}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 px-4 py-6 text-center sm:py-8">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                      {isDragging ? <UploadCloud className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Klik atau drop foto ke slot ini</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {slotPhoto ? slotPhoto.file.name : "Belum ada foto"}
                </span>

                {slotPhoto ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removePhoto(slot.id);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
                    aria-label={`Hapus foto ${slot.title}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
