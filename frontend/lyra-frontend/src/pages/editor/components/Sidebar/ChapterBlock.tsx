import {ChapterHeader} from "./ChapterHeader";
import SceneListItem from "./SceneListItem";
import type { Chapter } from "../../../../types/document";

interface ChapterBlockProps {
  chapter: Chapter;
  isOpen: boolean;
  activeSceneId: string | null;
  onToggle: () => void;
  onAddScene: () => void;
  onSceneClick: (sceneId: string) => void;
}

export default function ChapterBlock({
  chapter,
  isOpen,
  activeSceneId,
  onToggle,
  onAddScene,
  onSceneClick,
}: ChapterBlockProps) {
  return (
    <div className="mb-2">
      <ChapterHeader
        title={chapter.title}
        isOpen={isOpen}
        onToggle={onToggle}
        onAddScene={onAddScene}
      />

      {isOpen && (
        <ul className="ml-6 mt-1 space-y-1">
          {chapter.scenes.map((scene) => (
            <SceneListItem
              key={scene.id}
              scene={scene}
              isActive={scene.id === activeSceneId}
              onClick={() => onSceneClick(scene.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}