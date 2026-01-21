// src/components/organisms/Sidebar/Sidebar.tsx
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Chapter } from "../../../types/document";

import ChapterBlock from "./ChapterBlock";

import { SidebarHeader } from "./SidebarHeader";

import styles from "./Sidebar.module.css";

interface SidebarProps {
  title: string;
  chapters: Chapter[];
  activeSceneId: string | null;
  openChapterIds: Set<string>;
  onToggleChapter: (chapterId: string) => void;
  onSceneClick: (chapterId: string, sceneId: string) => void;
  onLoadChapter: (chapterId: string) => void;
  onAddChapter: () => void;
  onAddScene: (chapterId: string) => void;
  onReorderScenes: (chapterId: string, event: DragEndEvent) => void;
}

export default function Sidebar({
  title,
  chapters,
  activeSceneId,
  openChapterIds,
  onToggleChapter,
  onSceneClick,
  onLoadChapter,
  onAddChapter,
  onAddScene,
  onReorderScenes,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <SidebarHeader documentTitle={title} onAddChapter={onAddChapter} />

      <div className={styles.content}>
        <DndContext collisionDetection={closestCenter}>
          <SortableContext
            items={chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {chapters.map((chapter) => (
              <ChapterBlock
                key={chapter.id}
                chapter={chapter}
                isOpen={openChapterIds.has(chapter.id)}
                activeSceneId={activeSceneId}
                onToggle={() => onToggleChapter(chapter.id)}
                onAddScene={() => onAddScene(chapter.id)}
                onSceneClick={(sceneId) => onSceneClick(chapter.id, sceneId)}
                onLoadChapter={() => onLoadChapter(chapter.id)}
                onReorderScenes={(e) => onReorderScenes(chapter.id, e)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}