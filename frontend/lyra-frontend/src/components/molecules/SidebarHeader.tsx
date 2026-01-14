// src/components/molecules/SidebarHeader.tsx
import { Button } from "../atoms/Button";
import styles from "./SidebarHeader.module.css";

interface SidebarHeaderProps {
  documentTitle: string;
  onAddChapter: () => void;
}

export function SidebarHeader({ documentTitle, onAddChapter }: SidebarHeaderProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{documentTitle}</h2>
      <Button variant="primary" size="sm" onClick={onAddChapter}>
        + Chapter
      </Button>
    </div>
  );
}