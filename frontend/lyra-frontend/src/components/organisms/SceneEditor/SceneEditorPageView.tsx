// src/components/organisms/SceneEditor/SceneEditorPageView.tsx
import type { ReactNode } from "react";
import styles from "./SceneEditorPageView.module.css";

interface SceneEditorPageViewProps {
  children: ReactNode;
}

export function SceneEditorPageView({ children }: SceneEditorPageViewProps) {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}