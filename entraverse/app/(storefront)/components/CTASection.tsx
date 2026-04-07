import Link from "next/link";

export default function CTASection() {
  return (
    <section className="border-t border-slate-200 bg-[#f9fafb] py-12">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="text-3xl font-bold text-slate-900">Entraverse</h3>
            <p className="mt-3 max-w-2xl text-slate-600">
              We welcome you to visit our store in Indonesia and Malaysia. Nikmati pengalaman belanja teknologi
              yang cepat, aman, dan responsif bersama tim kami.
            </p>
            <p className="mt-5 text-lg font-semibold text-slate-900">Call Us Now: +62 21 1234 5678</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h4 className="text-lg font-semibold text-slate-900">Menu</h4>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <Link href="/">Beranda</Link>
              <Link href="/products">Produk</Link>
              <Link href="/tentang-kami">Tentang Kami</Link>
              <Link href="/garansi">Garansi</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
