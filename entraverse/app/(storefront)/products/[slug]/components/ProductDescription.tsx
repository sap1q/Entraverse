"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { toDescriptionHtml } from "@/lib/description";
import { cn } from "@/lib/utils";

interface ProductDescriptionProps {
  description: string;
}

const COLLAPSED_HEIGHT = 240;

export const ProductDescription = ({ description }: ProductDescriptionProps) => {
  const safeDescription =
    description.trim().length > 0 ? toDescriptionHtml(description) : "<p>Deskripsi produk belum tersedia.</p>";
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(COLLAPSED_HEIGHT);
  const [shouldClamp, setShouldClamp] = useState(false);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const measuredHeight = node.scrollHeight;
    const computed = window.getComputedStyle(node);
    const parsedLineHeight = Number.parseFloat(computed.lineHeight);
    const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : 24;
    const lines = measuredHeight / Math.max(1, lineHeight);

    setContentHeight(measuredHeight);
    setShouldClamp(lines > 10);
  }, [safeDescription]);

  return (
    <section className="rounded-3xl border border-transparent bg-white p-6">
      <h2 className="text-3xl font-semibold text-slate-900">Deskripsi Produk</h2>

      <div className="relative mt-4">
        <motion.div
          initial={false}
          animate={{
            maxHeight: !shouldClamp || expanded ? contentHeight + 8 : COLLAPSED_HEIGHT,
          }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div
            ref={contentRef}
            className="product-description prose prose-slate max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: safeDescription }}
          />
        </motion.div>

        <AnimatePresence>
          {shouldClamp && !expanded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/95 to-transparent"
            />
          ) : null}
        </AnimatePresence>
      </div>

      {shouldClamp ? (
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          <span>{expanded ? "Sembunyikan" : "Lihat Selengkapnya"}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      ) : null}
    </section>
  );
};
