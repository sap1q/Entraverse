const STORE_ADDRESS =
  "Jl. Kota Bambu Raya No.1, RT.5/RW.5, Kota Bambu Utara, Kec. Palmerah, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11420";

const MAP_EMBED_URL =
  "https://www.google.com/maps?q=" +
  encodeURIComponent(STORE_ADDRESS) +
  "&z=17&output=embed";

export function TradeInLocationSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#2a2d36] md:text-[2.65rem]">
            Drop Off Produk Kamu di Toko Kami
          </h2>
        </div>

        <div className="mx-auto mt-10 max-w-[680px] overflow-hidden rounded-[8px] shadow-[0_0_0_1px_rgba(15,23,42,0.05)] md:grid md:grid-cols-[280px_minmax(0,1fr)]">
          <div className="relative min-h-[250px] bg-slate-200">
            <iframe
              title="Lokasi Toko Entraverse"
              src={MAP_EMBED_URL}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="flex min-h-[250px] flex-col items-center justify-center bg-[#0d69a8] px-8 py-10 text-center text-white">
            <h3 className="text-[1.5rem] font-semibold tracking-tight md:text-[1.75rem]">
              LOKASI KAMI
            </h3>
            <p className="mt-5 max-w-[320px] text-[0.98rem] leading-[1.55] text-white/95">
              {STORE_ADDRESS}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
