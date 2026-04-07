"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { FileSearch, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { warrantyApi, type WarrantyRecord } from "@/lib/api/warranty";

type SearchState = "idle" | "loading" | "success" | "error";

const formatDate = (value: string | null): string => {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const coverageSummaryMap: Record<WarrantyRecord["status"], string> = {
  active: "Masa aktif garansi sampai:",
  expired: "Masa aktif garansi berakhir pada:",
  upcoming: "Masa aktif garansi mulai pada:",
  inactive: "Status garansi:",
};

const sectionTransition = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.28, ease: "easeOut" as const },
};

export function WarrantyLookupClient() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [result, setResult] = useState<WarrantyRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedInvoiceNumber = invoiceNumber.trim();
  const trimmedSerialNumber = serialNumber.trim();
  const canSubmit = trimmedInvoiceNumber.length > 0 && trimmedSerialNumber.length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSearchState("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const data = await warrantyApi.lookup(trimmedInvoiceNumber, trimmedSerialNumber);
      setResult(data);
      setSearchState("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Data garansi tidak ditemukan.");
      setSearchState("error");
    }
  };

  return (
    <section className="bg-white">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col px-4 pb-20 pt-8 md:px-6 md:pb-24 md:pt-10">
        <div className="max-w-3xl">
          <nav className="flex items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-blue-600">
              Home
            </Link>
            <span>/</span>
            <span className="font-medium text-blue-600">Garansi</span>
          </nav>

          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-900 md:text-[2.1rem]">
            Cek Garansi
          </h1>
        </div>

        <form
          className="mt-12 grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]"
          onSubmit={handleSubmit}
        >
          <label className="block">
            <span className="mb-2 block text-[11px] text-slate-400">
              No Invoice
            </span>
            <input
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              placeholder=""
              className="h-10 w-full rounded-[3px] border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] text-slate-400">
              Serial Number
            </span>
            <input
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              placeholder=""
              className="h-10 w-full rounded-[3px] border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-blue-500"
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit || searchState === "loading"}
            className="inline-flex h-10 items-center justify-center rounded-[3px] bg-[#2f80ed] px-5 text-sm font-semibold text-white transition hover:bg-[#1f6fe0] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {searchState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cek"}
          </button>
        </form>

        <div className="mt-14">
          <AnimatePresence mode="wait" initial={false}>
            {searchState === "idle" ? (
              <motion.div key="idle" {...sectionTransition} className="px-6 py-10 sm:px-10 sm:py-14">
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div className="relative flex h-72 w-full max-w-[520px] items-center justify-center">
                    <div className="absolute inset-x-10 top-1/2 h-32 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.08),transparent_65%)] blur-2xl" />
                    <div className="inline-flex h-52 w-52 items-center justify-center rounded-full border border-slate-200 bg-white/80 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
                      <FileSearch className="h-32 w-32 text-slate-300" strokeWidth={1.6} />
                    </div>
                  </div>

                  <div className="max-w-lg">
                    <p className="text-lg font-semibold text-slate-800">Belum ada data yang dicek</p>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      Isi nomor invoice dan serial number terlebih dahulu untuk memulai pengecekan status garansi perangkat.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {searchState === "loading" ? (
              <motion.div key="loading" {...sectionTransition} className="space-y-10">
                <div className="grid items-center gap-8 md:grid-cols-[170px_minmax(0,1fr)] md:gap-12">
                  <div className="flex justify-center md:justify-start">
                    <div className="h-[118px] w-[150px] animate-pulse rounded-[10px] bg-slate-100" />
                  </div>

                  <div className="max-w-[460px] space-y-4">
                    <div className="h-8 w-full max-w-[430px] animate-pulse rounded bg-slate-100" />
                    <div className="h-8 w-full max-w-[350px] animate-pulse rounded bg-slate-100" />
                    <div className="space-y-2 pt-2">
                      <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="h-5 w-36 animate-pulse rounded bg-slate-100" />
                  <div className="mt-4 bg-[#dfe9ff] px-6 py-6">
                    <div className="space-y-7">
                      <div className="space-y-3">
                        <div className="h-4 w-32 animate-pulse rounded bg-white/70" />
                        <div className="h-3 w-52 animate-pulse rounded bg-white/70" />
                      </div>
                      <div className="space-y-4">
                        <div className="h-4 w-52 animate-pulse rounded bg-white/70" />
                        <div className="space-y-2">
                          <div className="h-3 w-full animate-pulse rounded bg-white/70" />
                          <div className="h-3 w-[92%] animate-pulse rounded bg-white/70" />
                          <div className="h-3 w-[84%] animate-pulse rounded bg-white/70" />
                        </div>
                        <div className="space-y-2 pt-2">
                          <div className="h-3 w-full animate-pulse rounded bg-white/70" />
                          <div className="h-3 w-[88%] animate-pulse rounded bg-white/70" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span>Mencari data garansi...</span>
                </div>
              </motion.div>
            ) : null}

            {searchState === "error" ? (
              <motion.div key="error" {...sectionTransition} className="px-6 py-10 sm:px-10 sm:py-14">
                <div className="flex min-h-[320px] items-center justify-center">
                  <div className="max-w-xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Data garansi tidak ditemukan</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {errorMessage ??
                            `Tidak ada data garansi untuk invoice ${trimmedInvoiceNumber} dan serial number ${trimmedSerialNumber}.`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {searchState === "success" && result ? (
              <motion.div key="success" {...sectionTransition} className="space-y-10">
                <div className="grid items-center gap-8 md:grid-cols-[170px_minmax(0,1fr)] md:gap-12">
                  <div className="flex justify-center md:justify-start">
                    <div className="relative h-[118px] w-[150px]">
                      {result.product?.main_image ? (
                        <Image
                          src={result.product.main_image}
                          alt={result.product?.name ?? "Produk"}
                          fill
                          className="object-contain"
                          sizes="150px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <ShieldCheck className="h-9 w-9" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="max-w-[460px]">
                    <h2 className="text-[2.2rem] font-semibold leading-[1.15] tracking-tight text-slate-950">
                      {result.product?.name ?? "Produk Garansi"}
                    </h2>
                    <div className="mt-5 space-y-1 text-[12px] text-slate-600">
                      <p>Tanggal pembelian {formatDate(result.start_date)}</p>
                      <p>Serial Number {result.serial_number}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[18px] font-semibold text-slate-900">Cek Perlindungan</p>
                  <div className="mt-4 bg-[#dfe9ff] px-6 py-6 text-slate-700">
                    <div className="space-y-7">
                      <div>
                        <p className="text-[14px] font-semibold text-slate-800">Masa aktif garansi</p>
                        <p className="mt-2 text-[12px] text-slate-600">
                          {coverageSummaryMap[result.status]} {result.status === "upcoming"
                            ? formatDate(result.start_date)
                            : formatDate(result.end_date)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[14px] font-semibold text-slate-800">Apa Saja kerusakan yang di Cover:</p>
                        <div className="mt-4 space-y-5 text-[12px] leading-6 text-slate-600">
                          <div>
                            <p className="font-semibold text-slate-800">Software and Hardware Servis</p>
                            <p>
                              Kerusakan Meliputi perangkat lunak (Software) dan perangkat Keras (Hardware), yang ter
                              Defect dan Menyebabkan malfungsi dalam penggunaan normal dan terhindar dari Pembajakan
                              Software dan aplikasi dalam periode masa garansi semenjak transaksi dilakukan (1 Tahun).
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">Dukungan Lewat Obrolan dan Telepon</p>
                            <p>
                              Klaim garansi dapat dilakukan dengan menghubungi kami melalui panggilan telepon atau WhatsApp
                              atau melalui obrolan langsung melalui Tokopedia atau toko e-commerce serupa.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[15px] font-semibold text-slate-800">
                  Hubungi kami: <span className="text-blue-600">(+62) 822-8993-9315</span>
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
