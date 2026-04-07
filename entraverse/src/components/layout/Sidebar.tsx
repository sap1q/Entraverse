import type { ReactNode } from "react";

interface SidebarProps {
  children?: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="hidden w-64 border-r border-white/10 bg-slate-950/80 p-4 lg:block">
      {children}
    </aside>
  );
}
