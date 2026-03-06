import {SidebarHeader} from "./SidebarHeader";
import ChapterBlock from "./ChapterBlock";
import type { Chapter } from "../../../../types/document";
import type { DragEndEvent } from "@dnd-kit/core";

interface SidebarProps {
  title: string;
  chapters: Chapter[];
  activeSceneId: string | null;
  openChapterIds: Set<string>;
  onToggleChapter: (chapterId: string) => void;
  onSceneClick: (chapterId: string, sceneId: string) => void;
  onAddChapter: () => void;
  onAddScene: (chapterId: string) => void;
}

export default function Sidebar({
  title,
  chapters,
  activeSceneId,
  openChapterIds,
  onToggleChapter,
  onSceneClick,
  onAddChapter,
  onAddScene,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <SidebarHeader documentTitle={title} onAddChapter={onAddChapter} />

      <div className="flex-1 overflow-y-auto px-1 py-1">
        {chapters.map((chapter) => (
          <ChapterBlock
            key={chapter.id}
            chapter={chapter}
            isOpen={openChapterIds.has(chapter.id)}
            activeSceneId={activeSceneId}
            onToggle={() => onToggleChapter(chapter.id)}
            onAddScene={() => onAddScene(chapter.id)}
            onSceneClick={(sceneId) => onSceneClick(chapter.id, sceneId)}
          />
        ))}
      </div>
    </div>
  );
}