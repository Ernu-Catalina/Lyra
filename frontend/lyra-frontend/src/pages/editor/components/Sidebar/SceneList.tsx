// src/components/organisms/Sidebar/SceneList.tsx
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Scene } from "../../../types/document";
import SceneListItem from "../SceneListItem";

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
      <ul>
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