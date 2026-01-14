// src/templates/ProjectsLayout.tsx
import type { ReactNode } from "react";
import styles from "./ProjectsLayout.module.css";

interface ProjectsLayoutProps {
  header?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function ProjectsLayout({ header, actions, children }: ProjectsLayoutProps) {
  return (
    <div className={styles.container}>
      {header && <header className={styles.header}>{header}</header>}

      <div className={styles.actionsBar}>
        {actions}
      </div>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}