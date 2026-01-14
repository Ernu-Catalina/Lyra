// src/components/organisms/Sidebar/SceneList.tsx
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Scene } from "../../../types/document";
import SceneListItem from "../../molecules/SceneListItem";
import styles from "./SceneList.module.css";

interface SceneListProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onSceneClick: (sceneId: string) => void;
}

export function SceneList({ scenes, activeSceneId, onSceneClick }: SceneListProps) {
  return (
    <SortableContext
      items={scenes.map(s => s.id)}
      strategy={verticalListSortingStrategy}
    >
      <ul className={styles.list}>
        {scenes.map(scene => (
          <SceneListItem
            key={scene.id}
            scene={scene}
            isActive={scene.id === activeSceneId}
            onClick={() => onSceneClick(scene.id)}
          />
        ))}
      </ul>
    </SortableContext>
  );
}