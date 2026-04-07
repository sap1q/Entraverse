import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GalleryShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const GalleryShell = ({ children, className, ...props }: GalleryShellProps) => {
  return (
    <div className={cn("grid grid-cols-1 gap-3 self-start", className)} {...props}>
      {children}
    </div>
  );
};
