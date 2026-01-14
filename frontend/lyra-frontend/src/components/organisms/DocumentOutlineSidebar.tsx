// src/components/organisms/DocumentOutlineSidebar.tsx
// (placeholder – can be merged into Sidebar if not needed separately)
import type { ReactNode } from "react";
import styles from "./DocumentOutlineSidebar.module.css";

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
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2>{title}</h2>
        {actions}
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </aside>
  );
}