// src/components/molecules/SceneListItem.tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ContextMenuTrigger } from "./ContextMenuTrigger";
import type { MenuItem } from "./ContextMenuTrigger";
import type { Scene } from "../../types/document";
import styles from "./SceneListItem.module.css";

interface Props {
  scene: Scene;
  isActive: boolean;
  onClick: () => void;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
}

export default function SceneListItem({ scene, isActive, onClick, onRename, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: scene.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const menuItems: MenuItem[] = [];

  if (onRename) {
    menuItems.push({
      label: "Rename Scene",
      onClick: () => {
        const newName = prompt("New scene title:", scene.title);
        if (newName && newName.trim() !== scene.title.trim()) {
          onRename(newName.trim());
        }
      },
    });
  }
  
  if (onDelete) {
    menuItems.push({
      label: "Delete Scene",
      onClick: onDelete,
      danger: true,
    });
  }

  return (
    <ContextMenuTrigger menuItems={menuItems}>
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`${styles.item} ${isActive ? styles.active : ""}`}
        onClick={onClick}
      >
        ✦ {scene.title}
      </li>
    </ContextMenuTrigger>
  );
}