"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Headphones,
  Mail,
  MapPin,
  MessageCircleMore,
  PhoneCall,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

type ContactChannel = {
  title: string;
  description: string;
  value: string;
  href: string;
  icon: LucideIcon;
  accentClassName: string;
};

type ContactHighlight = {
  label: string;
  value: string;
};

type SupportStep = {
  title: string;
  description: string;
};

const CONTACT_CHANNELS: ContactChannel[] = [
  {
    title: "WhatsApp Priority",
    description: "Untuk pertanyaan cepat soal produk, stok, dan update pesanan.",
    value: "+62 822-8993-9315",
    href: "https://wa.me/6282289939315?text=Halo%20Tim%20Entraverse%2C%20saya%20ingin%20bertanya.",
    icon: MessageCircleMore,
    accentClassName: "from-emerald-500 via-green-500 to-lime-400",
  },
  {
    title: "Email Support",
    description: "Cocok untuk kebutuhan bantuan order, retur, atau kerja sama bisnis.",
    value: "support@entraverse.id",
    href: "mailto:support@entraverse.id",
    icon: Mail,
    accentClassName: "from-sky-500 via-blue-500 to-indigo-500",
  },
  {
    title: "Telepon Kantor",
    description: "Hubungi tim kami saat jam operasional untuk bantuan langsung.",
    value: "(+62) 82299944417",
    href: "tel:+6282299944417",
    icon: PhoneCall,
    accentClassName: "from-fuchsia-500 via-pink-500 to-rose-400",
  },
  {
    title: "Kunjungi Kami",
    description: "Datang langsung ke lokasi untuk konsultasi dan kebutuhan after-sales.",
    value: "Jl. Kota Bambu Raya No.1, Palmerah",
    href: "https://www.google.com/maps/place/Entraverse/@-6.1857907,106.8039633,17z/data=!4m6!3m5!1s0x2e69f78547d6fe3d:0x1d6ab5372583dce2!8m2!3d-6.1857907!4d106.8039633!16s%2Fg%2F11vs395jrr?entry=ttu",
    icon: MapPin,
    accentClassName: "from-amber-500 via-orange-500 to-rose-400",
  },
];

const CONTACT_HIGHLIGHTS: ContactHighlight[] = [
  { label: "Jam Layanan", value: "09.00 - 18.00 WIB " },
  { label: "Respons Cepat", value: "< 15 Menit" },
  { label: "Dukungan", value: "Produk & Order" },
];

const SUPPORT_STEPS: SupportStep[] = [
  {
    title: "Sampaikan kebutuhan Anda",
    description: "Pilih kanal tercepat lalu ceritakan kebutuhan Anda, mulai dari produk, garansi, sampai bantuan transaksi.",
  },
  {
    title: "Tim kami verifikasi detail",
    description: "Kami bantu menelusuri order, invoice, atau kebutuhan teknis agar solusi yang diberikan lebih akurat.",
  },
  {
    title: "Dapatkan solusi yang jelas",
    description: "Anda akan diarahkan ke langkah berikutnya dengan ringkas, transparan, dan tanpa proses berbelit.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Bisa tanya stok produk sebelum checkout?",
    answer: "Bisa. WhatsApp adalah kanal tercepat untuk cek ketersediaan produk, varian, dan estimasi pengiriman.",
  },
  {
    question: "Kalau ada kendala pesanan harus lewat mana?",
    answer: "Untuk bantuan pesanan, email support dan WhatsApp sama-sama bisa dipakai. Sertakan nomor order agar proses lebih cepat.",
  },
  {
    question: "Apakah bisa datang langsung ke lokasi?",
    answer: "Bisa. Anda dapat datang saat jam operasional untuk konsultasi, pengecekan produk, atau kebutuhan after-sales tertentu.",
  },
] as const;

export function ContactUsPageClient() {
  const reduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: reduceMotion ? 0 : 24,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.7,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <div className="overflow-hidden bg-[linear-gradient(180deg,#f6f9ff_0%,#edf4ff_36%,#ffffff_100%)] text-slate-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(14,165,233,0.18),transparent_22%),radial-gradient(circle_at_70%_72%,rgba(236,72,153,0.10),transparent_22%)]" />
        <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-36 md:px-6 md:pb-24 md:pt-40">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_460px]"
          >
            <div className="max-w-3xl">
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-700 shadow-[0_10px_30px_rgba(59,130,246,0.08)] backdrop-blur"
              >
                <Sparkles className="h-4 w-4" />
                Tim Support Entraverse
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[4rem] lg:leading-[1.02]"
              >
                Hubungi kami dan rasakan bantuan yang cepat, hangat, dan jelas.
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg"
              >
                Tim Entraverse siap membantu kebutuhan produk, pesanan, garansi, hingga kerja sama bisnis. Pilih kanal
                yang paling nyaman, lalu kami bantu arahkan ke solusi terbaik tanpa proses yang bertele-tele.
              </motion.p>

              <motion.div variants={itemVariants} className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="https://wa.me/6282289939315?text=Halo%20Tim%20Entraverse%2C%20saya%20ingin%20bertanya."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_70%,#38bdf8_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(29,78,216,0.32)] transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Chat via WhatsApp
                </Link>
                <Link
                  href="mailto:support@entraverse.id"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
                >
                  Kirim Email
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="mt-10 grid gap-3 sm:grid-cols-3"
              >
                {CONTACT_HIGHLIGHTS.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[26px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] backdrop-blur"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="relative">
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: [0, -10, 0],
                      }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: 6,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }
                }
                className="absolute -left-6 top-10 hidden rounded-[26px] border border-sky-100 bg-white/85 p-4 shadow-[0_22px_50px_rgba(56,189,248,0.18)] backdrop-blur lg:block"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Support Aktif</p>
                    <p className="text-sm text-slate-500">Siap bantu kebutuhan Anda</p>
                  </div>
                </div>
              </motion.div>

              <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(145deg,rgba(15,23,42,0.96)_0%,rgba(29,78,216,0.94)_58%,rgba(56,189,248,0.82)_100%)] p-6 text-white shadow-[0_30px_80px_rgba(30,41,59,0.24)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.16),transparent_26%)]" />
                <div className="absolute -right-12 top-10 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-white/80">
                    <BadgeCheck className="h-4 w-4" />
                    Contact Desk
                  </div>

                  <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">Mari bicara langsung dengan tim kami.</h2>
                  <p className="mt-4 max-w-md text-sm leading-7 text-white/78">
                    Saat Anda perlu bantuan sebelum beli, sesudah checkout, atau ingin menjalin kerja sama, kami hadir
                    untuk memberi jawaban yang terasa personal dan cepat.
                  </p>

                  <div className="mt-8 space-y-4">
                    <div className="rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <Clock3 className="mt-0.5 h-5 w-5 text-cyan-100" />
                        <div>
                          <p className="font-semibold text-white">Jam operasional</p>
                          <p className="mt-1 text-sm leading-6 text-white/78">
                            Senin - Sabtu: 09.00 - 18.00 WIB
                            <br />
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-100" />
                        <div>
                          <p className="font-semibold text-white">Alamat kantor</p>
                          <p className="mt-1 text-sm leading-6 text-white/78">
                            JL Kota Bambu Raya No.1 RT.05/RW.05, Kel. Kota Bambu Selatan,
                            <br />
                            Kec. Palmerah, Jakarta Barat, DKI Jakarta 11420
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="contact-channels" className="relative z-10 -mt-6 pb-4">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            {CONTACT_CHANNELS.map((channel) => {
              const Icon = channel.icon;

              return (
                <motion.article
                  key={channel.title}
                  variants={itemVariants}
                  className="group relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${channel.accentClassName}`} />
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-slate-950">{channel.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-500">{channel.description}</p>
                    <p className="mt-5 text-base font-semibold text-slate-900">{channel.value}</p>
                    <Link
                      href={channel.href}
                      target={channel.href.startsWith("http") ? "_blank" : undefined}
                      rel={channel.href.startsWith("http") ? "noreferrer" : undefined}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition-colors duration-300 hover:text-sky-500"
                    >
                      Hubungi sekarang
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]"
        >
          <motion.div
            variants={itemVariants}
            className="rounded-[34px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] p-8 shadow-[0_16px_48px_rgba(15,23,42,0.06)]"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
              <Sparkles className="h-4 w-4" />
              Kenapa menghubungi Entraverse
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              Kami bantu lebih dari sekadar menjawab pertanyaan.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Setiap pertanyaan yang masuk kami arahkan ke konteks yang tepat, jadi Anda tidak perlu mengulang cerita
              atau menebak harus mulai dari mana.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900">Bantuan pra-pembelian</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Konsultasi produk, ketersediaan varian, sampai rekomendasi device yang paling cocok.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900">Bantuan pasca-transaksi</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Update pesanan, kendala pembayaran, retur, dan pengecekan garansi dengan alur yang lebih jelas.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900">Kebutuhan bisnis</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Kerja sama procurement, pengadaan perangkat, dan kebutuhan omnicommerce terintegrasi.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-[34px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Headphones className="h-6 w-6 text-cyan-200" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">Alur Layanan</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Proses bantuan yang sederhana</h2>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {SUPPORT_STEPS.map((step, index) => (
                <div key={step.title} className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300/12 text-sm font-semibold text-cyan-100">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/72">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="border-y border-slate-200 bg-white/70 py-16 backdrop-blur-sm md:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div variants={itemVariants} className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">FAQ Ringkas</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 md:text-[2.4rem]">
                Pertanyaan yang paling sering masuk
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Jika Anda ingin jalur tercepat, bagian ini bisa jadi titik awal sebelum menghubungi tim kami.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {FAQ_ITEMS.map((item) => (
                <motion.article
                  key={item.question}
                  variants={itemVariants}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{item.answer}</p>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[38px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_42%,#dff3ff_100%)] px-6 py-10 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-10"
        >
          <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-indigo-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-sky-700">Siap Terhubung?</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 md:text-[2.5rem]">
                Mari mulai percakapan pertama Anda dengan Entraverse.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Kirim email, chat WhatsApp, atau kunjungi kantor kami. Kami sudah menyiapkan jalur bantuan yang lebih
                cepat agar Anda tidak perlu menunggu lama.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="mailto:support@entraverse.id"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
              >
                Email Sekarang
              </Link>
              <Link
                href="https://wa.me/6282289939315?text=Halo%20Tim%20Entraverse%2C%20saya%20butuh%20bantuan."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-transform duration-300 hover:-translate-y-0.5"
              >
                WhatsApp Kami
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
