// src/components/organisms/DocumentOutlineSidebar.tsx
import type { ReactNode } from "react";

interface DocumentOutlineSidebarProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function DocumentOutlineSidebar({
  title,
  children,
  actions,
}: DocumentOutlineSidebarProps) {
  return (
    <aside>
      <div>
        <h2>{title}</h2>
        {actions}
      </div>
      <div>
        {children}
      </div>
    </aside>
  );
}