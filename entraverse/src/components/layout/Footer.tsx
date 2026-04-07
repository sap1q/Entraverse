import Image from "next/image";
import Link from "next/link";

const socialIcons = [
  "/assets/images/icons/instagram.svg",
  "/assets/images/icons/tiktok.png",
  "/assets/images/icons/youtube.svg",
  "/assets/images/icons/threads.svg",
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#f8f9fb] text-slate-700">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.3fr_1fr]">
          <div>
            <Image
              src="/assets/images/hero/entraverse.png"
              alt="Entraverse"
              width={190}
              height={44}
              className="h-11 w-[190px] object-contain"
            />
            <p className="mt-3 max-w-sm text-base text-slate-600">
              Solusi omnicommerce untuk pengadaan hingga penjualan di satu tempat.
            </p>
            <div className="mt-4 flex gap-2">
              {socialIcons.map((icon) => (
                <span
                  key={icon}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white"
                >
                  <Image src={icon} alt="" width={18} height={18} />
                </span>
              ))}
            </div>
          </div>


          <div className="grid grid-cols-3 gap-6 text-sm text-slate-700">
            <div>
              <h4 className="mb-2 font-semibold text-slate-900">Bantuan</h4>
              <ul className="space-y-1.5">
                <li><Link href="#">Pusat Bantuan</Link></li>
                <li><Link href="#">Kebijakan Privasi</Link></li>
                <li><Link href="#">Syarat & Ketentuan</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-slate-900">Tentang</h4>
              <ul className="space-y-1.5">
                <li><Link href="#">Blog</Link></li>
                <li><Link href="#">Tentang Kami</Link></li>
                <li><Link href="#">Hubungi Kami</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-slate-900">Tentang Kami</h4>
              <ul className="space-y-1.5">
                <li><Link href="#">Perusahaan</Link></li>
                <li><Link href="#">Karier</Link></li>
                <li><Link href="#">Media Kit</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-4 text-sm text-slate-500 md:flex-row md:items-center">
          <p>&copy; 2026 PT Entraverse Teknologi Indonesia</p>
          <Image
            src="/assets/images/logo/secure-checkout.svg"
            alt="Secure Checkout SSL"
            width={184}
            height={32}
            className="h-8 w-[184px] object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
