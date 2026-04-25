import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { TradeInCategoriesSection } from "./components/TradeInCategoriesSection";
import { TradeInHeroModel } from "./components/TradeInHeroModel";
import { TradeInLocationSection } from "./components/TradeInLocationSection";
import { TradeInScrollButton } from "./components/TradeInScrollButton";
import { TradeInScrollTopButton } from "./components/TradeInScrollTopButton";

export const metadata: Metadata = {
  title: "Trade-In | Entraverse",
  description: "Halaman trade-in Entraverse.",
};

const TRADE_IN_HIGHLIGHTS = [
  {
    title: "100% Original Produk",
  },
  {
    title: "1K+ Penjualan Produk",
  },
  {
    title: "Garansi+",
  },
] as const;

const TRADE_IN_FEATURES = [
  {
    title: "Tukar Tambah",
    description:
      "Tukar Tambah produk lama kamu ke produk baru dan dapatkan promosi eksklusif.",
    image: "/assets/images/icons/tukar-tambah.png",
    imageAlt: "Tukar Tambah",
    imageWidth: 58,
    imageHeight: 58,
  },
  {
    title: "Jual Langsung",
    description:
      "Jual produk lama kamu sekarang dan dapatkan pembayaran secara instant.",
    image: "/assets/images/icons/jual-langsung.png",
    imageAlt: "Jual Langsung",
    imageWidth: 62,
    imageHeight: 48,
  },
] as const;

export default function TradeInPage() {
  return (
    <div className="bg-[#f4f5f7]">
      <section
        id="trade-in-hero"
        className="relative overflow-hidden bg-[linear-gradient(108deg,#10295f_0%,#183b92_26%,#2450cc_62%,#2f5be2_76%,#c79283_118%)] text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15),transparent_34%),radial-gradient(circle_at_78%_14%,rgba(255,255,255,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(77,160,255,0.22),transparent_28%)]" />
        <div className="absolute -left-16 top-24 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute right-8 top-10 h-52 w-52 rounded-full bg-fuchsia-200/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-40 md:px-6 md:pb-20 md:pt-44 lg:pb-24 lg:pt-36 xl:pt-40">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <Image
                  src="/assets/images/hero/e-logo.png"
                  alt="Entraverse"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                  priority
                />
                <span className="text-xs font-semibold uppercase tracking-[0.34em] text-white/75 sm:text-sm">
                  Program Trade-In
                </span>
              </div>

              <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.65rem] lg:leading-[1.05]">
                Trade In perangkat lama Anda tanpa proses yang ribet.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-8 text-white/78 sm:text-lg">
                Tukar perangkat lama Anda dalam hitungan menit dan dapatkan estimasi harga yang terasa masuk akal
                untuk upgrade ke perangkat terbaru.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <TradeInScrollButton
                  targetId="trade-in-main"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#16327f] transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Mulai Trade In
                </TradeInScrollButton>
                <TradeInScrollButton
                  targetId="trade-in-features"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition-[background-color,border-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12]"
                >
                  Lihat Fitur
                  <ArrowRight className="h-4 w-4" />
                </TradeInScrollButton>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-8 top-6 h-24 rounded-full bg-white/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[34px] border border-white/18 bg-white/[0.12] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                <div className="absolute -right-12 top-6 h-32 w-32 rounded-full bg-white/8 blur-3xl" />
                <div className="relative flex min-h-[320px] flex-col items-center justify-center sm:min-h-[360px]">
                  <div className="absolute inset-x-8 bottom-20 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  <div className="relative flex w-full items-center justify-center rounded-[28px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.24),rgba(255,255,255,0.07)_56%,transparent_76%)] px-2 pb-2 pt-4">
                    <div className="absolute inset-x-10 top-4 h-10 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute inset-4 rounded-[24px] border border-white/12" />
                    <TradeInHeroModel />
                  </div>

                  <p className="mt-8 max-w-sm text-center text-base font-medium leading-7 text-white/84">
                    Dapatkan estimasi harga dan promo khusus untuk perangkat lama Anda sebelum upgrade.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      <div className="h-8 bg-[#f4f5f7] md:h-10" />

      <section className="bg-[#2f52d3]">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-0 px-3 py-4 md:px-6">
          {TRADE_IN_HIGHLIGHTS.map((item) => {
            return (
              <div key={item.title} className="flex items-center justify-center border-r border-white/18 px-2 py-1 text-center last:border-r-0 md:px-4">
                <p className="text-[11px] font-semibold leading-tight text-white sm:text-sm md:text-[15px]">
                  {item.title}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <TradeInCategoriesSection />

      <section id="trade-in-features" className="scroll-mt-28 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[#2a2d36] md:text-[2.35rem]">
              Fitur Kami
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-[542px] grid-cols-2 gap-3 sm:gap-4 md:gap-[28px]">
            {TRADE_IN_FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="flex min-h-[238px] flex-col items-center rounded-[6px] bg-[#f7f7f7] px-4 pb-6 pt-8 text-center shadow-[0_0_0_1px_rgba(15,23,42,0.025)] sm:min-h-[272px] sm:px-6 sm:pb-8 sm:pt-10 md:min-h-[304px] md:px-8 md:pb-10 md:pt-14"
              >
                <div
                  className="relative"
                  style={{
                    width: feature.imageWidth,
                    height: feature.imageHeight,
                  }}
                >
                  <Image
                    src={feature.image}
                    alt={feature.imageAlt}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <h3 className="mt-6 text-[1rem] font-semibold leading-tight text-[#2a2d36] sm:text-[1.1rem] md:mt-8 md:text-[1.35rem]">
                  {feature.title}
                </h3>
                <p className="mt-4 max-w-[140px] text-[0.85rem] leading-[1.35] text-[#191c24] sm:max-w-[170px] sm:text-[0.92rem] md:mt-6 md:max-w-[190px] md:text-[1rem]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TradeInLocationSection />
      <TradeInScrollTopButton />
    </div>
  );
}
