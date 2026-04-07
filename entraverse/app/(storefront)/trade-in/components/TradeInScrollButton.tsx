"use client";

import type { ReactNode } from "react";

type TradeInScrollButtonProps = {
  targetId: string;
  className: string;
  children: ReactNode;
};

export function TradeInScrollButton({
  targetId,
  className,
  children,
}: TradeInScrollButtonProps) {
  const handleClick = () => {
    const element = document.getElementById(targetId);
    if (!element) return;

    const headerOffset = 112;
    const targetTop = element.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
