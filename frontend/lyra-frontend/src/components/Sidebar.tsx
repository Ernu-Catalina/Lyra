import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { Chapter } from "../types/document";
import SortableChapter from "./SortableChapter";

import "./Sidebar.css";

export interface SidebarProps {
  title: string;
  chapters: Chapter[];
  activeSceneId: string | null;
  openChapterId: string | null;
  onToggleChapter: (chapterId: string) => void;
  onSceneClick: (chapterId: string, sceneId: string) => void;
  onLoadChapter: (chapter: Chapter) => void;
  onAddChapter: () => void;
  onAddScene: (chapterId: string) => void;
  onReorderScenes: (chapterId: string, orderedIds: string[]) => void;
  onRenameChapter: (chapterId: string, title: string) => void;
  onDeleteChapter: (chapterId: string) => void;
  onRenameScene: (chapterId: string, sceneId: string, title: string) => void;
  onDeleteScene: (chapterId: string, sceneId: string) => void;
}

export default function Sidebar({
  title,
  chapters,
  activeSceneId,
  openChapterId,
  onToggleChapter,
  onSceneClick,
  onLoadChapter,
  onAddChapter,
  onReorderScenes,
}: SidebarProps) {
  return (
    <aside className="editor-sidebar">
      <h3>{title}</h3>

      <div className="sidebar-actions">
        <button onClick={onAddChapter}>+ Chapter</button>
      </div>
        <SortableContext
          items={chapters.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {chapters.map(chapter => (
            <SortableChapter
              key={chapter.id}
              chapter={chapter}
              activeSceneId={activeSceneId}
              openChapterId={openChapterId}
              onToggleChapter={onToggleChapter}
              onSceneClick={onSceneClick}
              onLoadChapter={onLoadChapter}
              onReorderScenes={onReorderScenes}
            />
          ))}
        </SortableContext>
    </aside>
  );
}
