import type { Scene } from "../../../../types/document";

interface SceneListItemProps {
  scene: Scene;
  isActive: boolean;
  onClick: (event: React.MouseEvent) => void;
}

export default function SceneListItem({ scene, isActive, onClick }: SceneListItemProps) {
  return (
    <li
      className={`py-1.5 px-3 rounded-md cursor-pointer transition-colors ${
        isActive ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
      onClick={onClick}
    >
      {scene.title || "Untitled Scene"}
    </li>
  );
}