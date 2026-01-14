// src/components/molecules/ChapterHeader.tsx
import { DragHandle } from "../atoms/DragHandle";
import { ChevronToggle } from "../atoms/ChevronToggle";
import { ContextMenuTrigger } from "./ContextMenuTrigger";
import styles from "./ChapterHeader.module.css";
import type { MenuItem } from "./ContextMenuTrigger";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

interface ChapterHeaderProps {
  title: string;
  isOpen: boolean;
  isActive?: boolean;
  onToggle: () => void;
  onAddScene?: () => void;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners | undefined;
}

export function ChapterHeader({
  title,
  isOpen,
  isActive = false,
  onToggle,
  onAddScene,
  onRename,
  onDelete,
  dragAttributes,
  dragListeners,
}: ChapterHeaderProps) {
const menuItems: MenuItem[] = [];

if (onAddScene) {
  menuItems.push({
    label: "Add Scene",
    onClick: onAddScene,
  });
}

if (onRename) {
  menuItems.push({
    label: "Rename Chapter",
    onClick: () => {
      const newName = prompt("New chapter name:", title);
      if (newName && newName.trim() !== title.trim()) {
        onRename(newName.trim());
      }
    },
  });
}

if (onDelete) {
  menuItems.push({
    label: "Delete Chapter",
    onClick: onDelete,
    danger: true,
  });
}

  return (
    <ContextMenuTrigger menuItems={menuItems}>
      <div className={`${styles.header} ${isActive ? styles.active : ""}`}>
        <div className={styles.left}>
          <div {...dragAttributes} {...dragListeners}>
            <DragHandle />
          </div>
          <span className={styles.title} onClick={onToggle}>
            {title}
          </span>
        </div>

        <div className={styles.right}>
          <ChevronToggle isOpen={isOpen} onClick={onToggle} />
        </div>
      </div>
    </ContextMenuTrigger>
  );
}