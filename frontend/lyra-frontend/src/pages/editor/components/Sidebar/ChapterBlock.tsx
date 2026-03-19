import {ChapterHeader} from "./ChapterHeader";
import SceneListItem from "./SceneListItem";
import type { Chapter } from "../../../../types/document";

interface ChapterBlockProps {
  chapter: Chapter;
  isOpen: boolean;
  activeSceneId: string | null;
  activeChapterId: string | null;   
  onToggle: () => void;
  onAddScene: () => void;
  onSceneClick: (sceneId: string) => void;
  onChapterClick: () => void;           // NEW
}

export default function ChapterBlock({
  chapter,
  isOpen,
  activeSceneId,
  activeChapterId,
  onToggle,
  onAddScene,
  onSceneClick,
  onChapterClick,
}: ChapterBlockProps) {
  return (
    <div className="mb-2">
      <ChapterHeader
        title={chapter.title}
        isOpen={isOpen}
        isActive={!activeSceneId && chapter.id === activeChapterId} // active if chapter selected but no scene
        onToggle={onToggle}
        onChapterClick={onChapterClick}
        onAddScene={onAddScene}
      />

      {isOpen && (
        <ul className="ml-6 mt-1 space-y-1">
          {chapter.scenes.map((scene) => (
            <SceneListItem
              key={scene.id}
              scene={scene}
              isActive={scene.id === activeSceneId}
              onClick={(event) => {
                // Guard: stop propagation only if event exists
                event?.stopPropagation();
                onSceneClick(scene.id);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}