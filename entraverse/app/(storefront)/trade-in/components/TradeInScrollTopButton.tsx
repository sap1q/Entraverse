"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function TradeInScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Kembali ke atas"
      className={`fixed bottom-8 right-7 z-40 inline-flex h-11 w-11 items-center justify-center rounded-[7px] bg-[#4279f2] text-white shadow-[0_12px_24px_rgba(66,121,242,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#3367d6] ${
        visible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" strokeWidth={2.2} />
    </button>
  );
}
