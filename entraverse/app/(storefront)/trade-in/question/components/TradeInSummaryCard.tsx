"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { Camera, CircleCheckBig, PackageCheck, Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatCurrencyIDR } from "@/lib/utils/formatter";

type SummaryLine = {
  label: string;
  value: string;
};

interface TradeInSummaryCardProps {
  productName: string;
  productImage: string;
  basePrice: number;
  variantLabel?: string | null;
  estimate: number;
  loading: boolean;
  continueLoading?: boolean;
  canSubmit: boolean;
  hasCompletedForm: boolean;
  summaryLines: SummaryLine[];
  onCheckLimit: () => void;
  onContinue: () => void;
}

function AnimatedCurrency({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const controls = animate(previousValue.current, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });

    previousValue.current = value;

    return () => controls.stop();
  }, [value]);

  return <span>{formatCurrencyIDR(displayValue)}</span>;
}

export function TradeInSummaryCard({
  productName,
  productImage,
  basePrice,
  variantLabel,
  estimate,
  loading,
  continueLoading = false,
  canSubmit,
  hasCompletedForm,
  summaryLines,
  onCheckLimit,
  onContinue,
}: TradeInSummaryCardProps) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.38)] sm:p-6">
      <div className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Image src={productImage} alt={productName} fill unoptimized className="object-cover" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Produk yang dijual</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-900">{productName}</p>
          {variantLabel ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <Tag className="h-3.5 w-3.5" />
              {variantLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-[24px] bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_42%,#ffffff_100%)] p-5">
        <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
          Estimasi Limit Hingga
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="mt-1 whitespace-nowrap text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.5rem]">
              <AnimatedCurrency value={estimate} />
            </p>
          </div>

          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
          <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Basis kalkulasi harga offline</p>
            <p className="mt-1 leading-6">
              Estimasi trade-in dimulai dari harga offline produk, lalu disesuaikan oleh bobot jawaban yang Anda isi.
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrencyIDR(basePrice)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          {summaryLines.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {summaryLines.map((item) => (
                <div key={`${item.label}-${item.value}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="text-right font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-slate-500">
              Pilih kondisi perangkat Anda untuk melihat rincian perhitungan.
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl px-4 py-3 text-sm",
            hasCompletedForm ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"
          )}
        >
          {hasCompletedForm ? (
            <CircleCheckBig className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <Camera className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p className="leading-6">
            {hasCompletedForm
              ? "Semua data dasar sudah terisi. Anda bisa cek limit kapan saja, lalu lanjut ke checkout."
              : "Lengkapi seluruh pertanyaan termasuk foto untuk mengaktifkan langkah berikutnya."}
          </p>
        </div>

        <div className="space-y-2.5">
          <Button
            type="button"
            onClick={onCheckLimit}
            loading={loading}
            disabled={!hasCompletedForm || loading}
            variant="outline"
            className="h-11 w-full rounded-2xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Cek Limit
          </Button>

          <Button
            type="button"
            onClick={onContinue}
            loading={continueLoading}
            disabled={!canSubmit}
            className="h-11 w-full rounded-2xl bg-blue-600 hover:bg-blue-700"
          >
            Lanjut ke Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
