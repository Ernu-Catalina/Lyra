// features/editor/hooks/useActiveScene.ts
import { useState, useCallback } from "react";

export function useActiveScene() {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"scene" | "chapter">("scene");

  const selectScene = useCallback((chapterId: string, sceneId: string) => {
    setActiveChapterId(chapterId);
    setActiveSceneId(sceneId);
    setEditorMode("scene");
  }, []);

  const selectChapter = useCallback((chapterId: string) => {
    setActiveChapterId(chapterId);
    setActiveSceneId(null);
    setEditorMode("chapter");
  }, []);

  const clearSelection = useCallback(() => {
    setActiveChapterId(null);
    setActiveSceneId(null);
    setEditorMode("scene");
  }, []);

  return {
    activeChapterId,
    activeSceneId,
    editorMode,
    selectScene,
    selectChapter,
    clearSelection,
  };
}