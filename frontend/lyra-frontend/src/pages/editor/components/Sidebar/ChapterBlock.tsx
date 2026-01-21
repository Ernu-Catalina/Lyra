// src/components/organisms/Sidebar/ChapterBlock.tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DndContext, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Chapter } from "../../../types/document";   // ← removed unused Scene
import { ChapterHeader } from "../ChapterHeader";  // ← named import
import SceneListItem from "../SceneListItem";
import styles from "./ChapterBlock.module.css";

interface ChapterBlockProps {
  chapter: Chapter;
  isOpen: boolean;
  activeSceneId: string | null;
  onToggle: () => void;
  onAddScene: () => void;
  onSceneClick: (sceneId: string) => void;
  onLoadChapter: () => void;           // kept — can be used later
  onReorderScenes: (event: DragEndEvent) => void;
}

export default function ChapterBlock({
  chapter,
  isOpen,
  activeSceneId,
  onToggle,
  onAddScene,
  onSceneClick,
  // onLoadChapter,                      // still here — not unused if you use it
  onReorderScenes,
}: ChapterBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.block}>
      <ChapterHeader
        title={chapter.title}
        isOpen={isOpen}
        onToggle={onToggle}
        onAddScene={onAddScene}
        dragAttributes={attributes}
        dragListeners={listeners}
      />

      {isOpen && (
        <DndContext collisionDetection={closestCenter} onDragEnd={onReorderScenes}>
          <SortableContext
            items={chapter.scenes.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className={styles.sceneList}>
              {chapter.scenes.map((scene) => (
                <SceneListItem
                  key={scene.id}
                  scene={scene}
                  isActive={scene.id === activeSceneId}
                  onClick={() => onSceneClick(scene.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}