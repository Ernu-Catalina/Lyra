import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Chapter } from "../types/document";
import { DndContext } from "@dnd-kit/core";
import { closestCenter } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";

export interface SortableChapterProps {
  chapter: Chapter;
  activeSceneId: string | null;
  openChapterId: string | null;
  onToggleChapter: (chapterId: string) => void;
  onSceneClick: (chapterId: string, sceneId: string) => void;
  onLoadChapter: (chapter: Chapter) => void;
  onReorderScenes: (chapterId: string, orderedIds: string[]) => void;
}

function handleSceneDragEnd(
  chapter: Chapter,
  event: DragEndEvent,
  onReorderScenes: (chapterId: string, orderedIds: string[]) => void
) {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const oldIndex = chapter.scenes.findIndex(s => s.id === active.id);
  const newIndex = chapter.scenes.findIndex(s => s.id === over.id);

  if (oldIndex === -1 || newIndex === -1) return;

  const reordered = [...chapter.scenes];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);

  onReorderScenes(
    chapter.id,
    reordered.map(s => s.id)
  );
}

export default function SortableChapter({
  chapter,
  activeSceneId,
  openChapterId,
  onToggleChapter,
  onSceneClick,
  onLoadChapter,
  onReorderScenes
}: SortableChapterProps) {
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
    <div ref={setNodeRef} style={style} className="chapter-block">
      {/* Drag handle ONLY */}
      <div className="drag-handle" {...attributes} {...listeners}>
        ⠿
      </div>

      <div className="chapter-header">
        <span
          className="chapter-toggle"
          onClick={() => onToggleChapter(chapter.id)}
        >
          {openChapterId === chapter.id ? "▾" : "▸"}
        </span>

        <span
          className="chapter-title"
          onDoubleClick={() => onLoadChapter(chapter)}
        >
          {chapter.title}
        </span>
      </div>

      {/* Scenes */}
      {openChapterId === chapter.id && (
        <ul>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={(event) =>
              handleSceneDragEnd(chapter, event, onReorderScenes)
            }
          >
            <SortableContext
              items={chapter.scenes.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {chapter.scenes.map(scene => (
                <div
                  key={scene.id}
                  className={
                    "scene-item" +
                    (scene.id === activeSceneId ? " active" : "")
                  }
                  onClick={() => onSceneClick(chapter.id, scene.id)}
                >
                  {scene.title}
                </div>
              ))}
            </SortableContext>
          </DndContext>

        </ul>
      )}

    </div>
  );
}
