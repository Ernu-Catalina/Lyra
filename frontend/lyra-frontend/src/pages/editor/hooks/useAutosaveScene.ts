// src/features/editor/hooks/useAutosave.ts
import { useEffect } from "react";
import api from "../../../api/client";

export function useAutosave(
  projectId: string | undefined,
  documentId: string | undefined,
  chapterId: string | undefined,
  sceneId: string | undefined,
  content: string,
  enabled: boolean = true,
  delay: number = 1000,
  onSave?: (content: string) => void
) {
  useEffect(() => {
    if (!enabled || !projectId || !documentId || !chapterId || !sceneId || !content) return;

    const timeout = setTimeout(async () => {
      try {
        await api.patch(
          `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes/${sceneId}`,
          { content }
        );
        onSave?.(content);
      } catch (err) {
        console.error("Autosave failed", err);
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [content, projectId, documentId, chapterId, sceneId, enabled, delay]);
}