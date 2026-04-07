"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import type { Testimonial } from "@/lib/api/types";

type TestimonialsSectionProps = {
  testimonials: Testimonial[];
};

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  { id: "fallback-1", quote: "Fast response and good quality.", author: "Budi", role: "Tokopedia Customer" },
  {
    id: "fallback-2",
    quote: "Seller ramah dan informatif, produk sampai lebih cepat dari estimasi.",
    author: "Nyoman",
    role: "Tokopedia Customer",
  },
  {
    id: "fallback-3",
    quote: "VR experience yang bagus dengan harga terjangkau.",
    author: "Jonathan",
    role: "Tokopedia Customer",
  },
];

const MOBILE_WIDTH = 276;
const DESKTOP_WIDTH = 340;
const CARD_GAP = 16;
const AUTO_PLAY_MS = 4500;

export default function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const baseTestimonials = testimonials.length > 0 ? testimonials : FALLBACK_TESTIMONIALS;
  const duplicatedTestimonials = useMemo(
    () => [...baseTestimonials, ...baseTestimonials, ...baseTestimonials],
    [baseTestimonials]
  );

  const trackShellRef = useRef<HTMLDivElement>(null);
  const baseLength = baseTestimonials.length;
  const [activeIndex, setActiveIndex] = useState(baseLength);
  const [withTransition, setWithTransition] = useState(true);
  const [cardWidth, setCardWidth] = useState(DESKTOP_WIDTH);
  const [shellWidth, setShellWidth] = useState(0);

  useEffect(() => {
    const syncWidth = () => {
      setCardWidth(window.innerWidth >= 768 ? DESKTOP_WIDTH : MOBILE_WIDTH);
      setShellWidth(trackShellRef.current?.offsetWidth ?? 0);
    };

    syncWidth();
    window.addEventListener("resize", syncWidth);
    return () => window.removeEventListener("resize", syncWidth);
  }, []);

  useEffect(() => {
    if (baseLength <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => current + 1);
    }, AUTO_PLAY_MS);

    return () => window.clearInterval(timer);
  }, [baseLength]);

  useEffect(() => {
    if (withTransition) return;

    const frame = window.requestAnimationFrame(() => {
      setWithTransition(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [withTransition]);

  const movePrev = () => setActiveIndex((current) => current - 1);
  const moveNext = () => setActiveIndex((current) => current + 1);

  const handleTransitionEnd = () => {
    if (activeIndex >= baseLength * 2) {
      setWithTransition(false);
      setActiveIndex(baseLength);
      return;
    }

    if (activeIndex < baseLength) {
      setWithTransition(false);
      setActiveIndex(baseLength * 2 - 1);
    }
  };

  const centerOffset = (shellWidth - cardWidth) / 2;
  const translateX = centerOffset - activeIndex * (cardWidth + CARD_GAP);

  return (
    <section className="bg-[#e9eef7] py-14 md:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="mb-2 text-sm font-semibold text-blue-600">Testimoni</p>
            <h2 className="text-3xl font-bold text-slate-900">What Our Customers Say</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={movePrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={moveNext}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={trackShellRef} className="overflow-hidden">
          <div
            className="flex"
            style={{
              gap: `${CARD_GAP}px`,
              transform: `translate3d(${translateX}px, 0, 0)`,
              transition: withTransition ? "transform 650ms cubic-bezier(0.22, 0.61, 0.36, 1)" : "none",
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {duplicatedTestimonials.map((testimonial, index) => {
              const isActive = index === activeIndex;

              return (
                <article
                  key={`${testimonial.id}-${index}`}
                  className={`shrink-0 rounded-2xl border p-5 shadow-sm transition ${
                    isActive
                      ? "scale-[1.02] border-blue-200 bg-white shadow-md"
                      : "border-slate-200 bg-white/90 opacity-80"
                  }`}
                  style={{ width: `${cardWidth}px` }}
                >
                  <Quote className="mb-3 h-5 w-5 text-blue-600" />
                  <p className="min-h-20 text-sm leading-relaxed text-slate-700 md:text-base">{testimonial.quote}</p>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-900">{testimonial.author}</p>
                    <p className="text-xs text-slate-500">{testimonial.role}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
