import { MapPin, Phone, Instagram, Youtube, Twitter, Facebook } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#f8f9fb] text-slate-700" style={{ fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif' }}>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6">
        {/* Main grid: 2 columns - left content, right menu */}
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Left Column: Brand, Description, Address & Phone */}
          <div>
            <Image
              src="/assets/images/hero/entraverse.png"
              alt="Entraverse"
              width={190}
              height={44}
              className="h-11 w-[190px] object-contain"
            />
            {/* Description - normal width, not too long */}
            <p className="mt-3 max-w-md text-sm text-slate-600 leading-relaxed">
              Solusi omnicommerce terintegrasi untuk pengadaan hingga penjualan dalam satu platform.
              Temukan berbagai produk unggulan di Official Store Entraverse dengan akses yang aman,
              mudah, dan transparan. Kami hadir untuk menyederhanakan proses bisnis dan belanja Anda
              langsung dari satu sistem yang andal.
            </p>
            {/* Address & Phone - clean layout */}
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex gap-2">
                <MapPin size={18} className="mt-0.5 shrink-0" />
                <span>
                  JL Kota Bambu Raya No.1 RT.05/RW.05, Kel. Kota Bambu Selatan,
                  <br />
                  Kec. Palmerah, Jakarta Barat, DKI Jakarta 11420
                </span>
              </div>
              <div className="flex gap-2">
                <Phone size={18} className="shrink-0" />
                <span>+62 822-8993-9315</span>
              </div>
            </div>
          </div>

          {/* Right Column: Bantuan + Tentang - aligned to the right */}
          <div className="flex justify-end">
            <div className="flex gap-12">
              {/* Bantuan */}
              <div>
                <h4 className="mb-2 text-base font-semibold text-slate-900">
                  Bantuan
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li><Link href="#" className="hover:underline">Pusat Bantuan</Link></li>
                  <li><Link href="#" className="hover:underline">Kebijakan Privasi</Link></li>
                  <li><Link href="#" className="hover:underline">Syarat &amp; Ketentuan</Link></li>
                </ul>
              </div>

              {/* Tentang */}
              <div>
                <h4 className="mb-2 text-base font-semibold text-slate-900">
                  Tentang
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li><Link href="/tentang-kami" className="hover:underline">Tentang Kami</Link></li>
                  <li><Link href="#" className="hover:underline">Blog</Link></li>
                  <li><Link href="/hubungi-kami" className="hover:underline">Hubungi Kami</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar: Copyright left, Social Icons right (no label) */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-4 text-sm text-slate-500 md:flex-row">
          <p>&copy; 2026 PT Entraverse Teknologi Indonesia</p>
          <div className="flex gap-2">
            <Link
              href="#"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Instagram size={16} />
            </Link>
            <Link
              href="#"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Youtube size={16} />
            </Link>
            <Link
              href="#"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Twitter size={16} />
            </Link>
            <Link
              href="#"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Facebook size={16} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
