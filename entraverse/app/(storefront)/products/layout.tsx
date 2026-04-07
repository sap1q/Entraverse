import type { ReactNode } from "react";

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return <section className="bg-[#f4f6fb]">{children}</section>;
}
