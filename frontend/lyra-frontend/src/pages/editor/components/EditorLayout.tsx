// src/components/templates/EditorLayout.tsx
import type { ReactNode } from "react";
import styles from "./EditorLayout.module.css";

interface EditorLayoutProps {
  sidebar: ReactNode;
  toolbar?: ReactNode;
  editor: ReactNode;
  footer?: ReactNode;
}

export function EditorLayout({
  sidebar,
  toolbar,
  editor,
  footer,
}: EditorLayoutProps) {
  return (
    <div className={styles.container}>
      {sidebar}

      <div className={styles.mainArea}>
        {toolbar && <div className={styles.toolbarWrapper}>{toolbar}</div>}

        <main className={styles.editorContent}>
          {editor}
        </main>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  );
}