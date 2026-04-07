import {
  BadgePercent,
  Headset,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";
import type { WhyChooseItem } from "@/lib/api/types";

type WhyChooseUsSectionProps = {
  items: WhyChooseItem[];
};

const iconMap = {
  package: PackageSearch,
  shield: ShieldCheck,
  "badge-percent": BadgePercent,
  headset: Headset,
} as const;

export default function WhyChooseUsSection({ items }: WhyChooseUsSectionProps) {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold text-blue-600">Kenapa Entraverse?</p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Mengapa Orang Memilih Kami</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <Icon className="h-7 w-7 text-emerald-500" />
                </div>
                <h6 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h6>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
