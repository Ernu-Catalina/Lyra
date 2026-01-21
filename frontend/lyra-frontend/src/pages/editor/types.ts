// features/editor/types.ts
import type { Chapter, Scene, DocumentOutline } from "../../types/document";

// Re-export global ones for convenience inside feature
export type { Chapter, Scene, DocumentOutline };

// Editor-specific
export type EditorMode = "scene" | "chapter";

export interface SceneLoadPayload {
  chapterId: string;
  sceneId: string;
  content: string;
  wordcount: number;
}

export interface ChapterLoadPayload {
  chapter: Chapter;
  // concatenated content can be added later
}

export interface ReorderScenesPayload {
  chapterId: string;
  activeId: string;
  overId: string | null;
}