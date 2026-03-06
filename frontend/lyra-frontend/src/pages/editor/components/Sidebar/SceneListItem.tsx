import type { Scene } from "../../../../types/document";

interface SceneListItemProps {
  scene: Scene;
  isActive: boolean;
  onClick: () => void;
}

export default function SceneListItem({ scene, isActive, onClick }: SceneListItemProps) {
  return (
    <li
      onClick={onClick}
      className={`
        py-1.5 px-3 rounded-md cursor-pointer transition-colors
        ${isActive 
          ? "bg-[var(--accent)]/20 text-[var(--accent)] font-medium" 
          : "hover:bg-[var(--bg-secondary)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
      `}
    >
      {scene.title || "Untitled Scene"}
    </li>
  );
}