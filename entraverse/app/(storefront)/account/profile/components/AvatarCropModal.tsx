"use client";

import { useEffect, useState } from "react";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AvatarCropModalProps {
  imageSrc: string | null;
  open: boolean;
  processing?: boolean;
  onCancel: () => void;
  onConfirm: (cropPixels: Area) => Promise<void> | void;
}

export function AvatarCropModal({
  imageSrc,
  open,
  processing = false,
  onCancel,
  onConfirm,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.4);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !processing) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onCancel, open, processing]);

  if (!open || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Crop Foto Profil</h2>
            <p className="mt-1 text-sm text-slate-500">Atur posisi foto agar pas saat tampil sebagai avatar lingkaran.</p>
          </div>

          <button
            type="button"
            aria-label="Tutup popup crop"
            onClick={onCancel}
            disabled={processing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="relative h-[360px] overflow-hidden rounded-3xl bg-slate-950">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={0.4}
              maxZoom={3}
              aspect={1}
              cropSize={{ width: 210, height: 210 }}
              cropShape="round"
              showGrid={false}
              objectFit="cover"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
            />
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Zoom</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={3}
              step={0.05}
              value={zoom}
              disabled={processing}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button type="button" variant="outline" disabled={processing} onClick={onCancel} className="h-11 rounded-2xl">
            Batal
          </Button>
          <Button
            type="button"
            loading={processing}
            disabled={processing || !croppedAreaPixels}
            onClick={() => {
              if (!croppedAreaPixels) return;
              void onConfirm(croppedAreaPixels);
            }}
            className="h-11 rounded-2xl bg-blue-600 hover:bg-blue-700"
          >
            {processing ? "Memproses..." : "Gunakan Foto Ini"}
          </Button>
        </div>
      </div>
    </div>
  );
}
