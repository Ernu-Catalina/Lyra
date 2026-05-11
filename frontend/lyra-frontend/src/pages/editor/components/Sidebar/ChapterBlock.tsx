import {ChapterHeader} from "./ChapterHeader";
import SceneListItem from "./SceneListItem";
import { Plus } from "lucide-react";
import type { Chapter } from "../../../../types/document";

interface ChapterBlockProps {
  chapter: Chapter;
  isOpen: boolean;
  activeSceneId: string | null;
  activeChapterId: string | null;   
  onToggle: () => void;
  onAddScene: () => void;
  onSceneClick: (sceneId: string) => void;
  onChapterClick: () => void;
  onContextMenuChapter: (e: React.MouseEvent) => void;
  onContextMenuScene: (e: React.MouseEvent, sceneId: string) => void;
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
  onContextMenuChapter,
  onContextMenuScene
}: ChapterBlockProps) {
  return (
    <div className="mb-2">
      <div onContextMenu={onContextMenuChapter}>
      <ChapterHeader
        title={chapter.title}
        isOpen={isOpen}
        isActive={!activeSceneId && chapter.id === activeChapterId} // active if chapter selected but no scene
        onToggle={onToggle}
        onChapterClick={onChapterClick}
        onAddScene={onAddScene}
      />
      </div>
      {isOpen && (
        <ul className="ml-6 mt-1 space-y-1">
          {chapter.scenes.map((scene) => (
            <SceneListItem
              key={scene.id || `${chapter.id}-scene-${scene.title}`}
              scene={scene}
              isActive={scene.id === activeSceneId}
              onClick={(event) => {
                event?.stopPropagation();
                onSceneClick(scene.id);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onContextMenuScene(event, scene.id);
              }}
            />
          ))}
          
          {/* Add Scene Button */}
          <li
            className="px-3 rounded-md cursor-pointer transition-colors text-[var(--border)] text-[0.9rem] hover:text-[var(--accent)] flex items-center gap-0.5"
            onClick={onAddScene}
          >
            <Plus size={14} />
            <span>Add scene</span>
            
          </li>
        </ul>
      )}
    </div>
  );
}