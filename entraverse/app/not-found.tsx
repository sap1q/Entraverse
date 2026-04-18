import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-white">
      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-14 md:px-6 md:py-20 lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:gap-14">
        <div className="order-2 max-w-xl lg:order-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600">
            <AlertCircle className="h-4 w-4" />
            Oops! Halaman yang Anda cari tidak tersedia.
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Halaman tidak ditemukan
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
            Maaf, tautan yang Anda buka mungkin salah, sudah dipindahkan, atau alamat website yang dimasukkan
            tidak valid.
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
            >
              Kembali ke Beranda
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/products"
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-600"
            >
              Lihat semua produk
            </Link>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-6">
            <Image
              src="/assets/images/icons/404.png"
              alt="Ilustrasi halaman 404 Entraverse"
              width={1000}
              height={643}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
