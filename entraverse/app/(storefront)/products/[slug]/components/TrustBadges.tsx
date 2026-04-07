import { Award, Clock3, Headset, ShieldCheck } from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, title: "Garansi Resmi", subtitle: "1 Tahun" },
  { icon: Award, title: "Produk Original", subtitle: "100% Authentic" },
  { icon: Clock3, title: "Pengiriman Cepat", subtitle: "1-3 Hari" },
  { icon: Headset, title: "Support 24/7", subtitle: "CS Responsif" },
];

export const TrustBadges = () => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {BADGES.map((badge) => {
        const Icon = badge.icon;

        return (
          <div key={badge.title} className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center">
            <Icon className="mx-auto h-5 w-5 text-blue-600" />
            <p className="mt-2 text-sm font-semibold text-slate-900">{badge.title}</p>
            <p className="text-xs text-slate-500">{badge.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
};
