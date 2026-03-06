// src/pages/editor/hooks/useAutosaveScene.ts
import { useEffect } from "react";
import api from "../../../api/client";

interface AutosaveProps {
  projectId?: string;
  documentId?: string;
  activeChapterId?: string;
  activeSceneId?: string;
  content: string;
  shouldSave: boolean;
  debounceMs?: number;
  onSaved?: (savedContent: string) => void;
}

export function useAutosaveScene({
  projectId,
  documentId,
  activeChapterId,
  activeSceneId,
  content,
  shouldSave,
  debounceMs = 1500,
  onSaved,
}: AutosaveProps) {
  useEffect(() => {
    if (!shouldSave || !projectId || !documentId || !activeChapterId || !activeSceneId) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        console.log("Autosaving scene:", { activeSceneId, contentLength: content.length });
        await api.put(
          `/projects/${projectId}/documents/${documentId}/chapters/${activeChapterId}/scenes/${activeSceneId}`,
          { content }
        );
        onSaved?.(content);
        console.log("Scene autosaved successfully");
      } catch (err) {
        console.error("Autosave failed:", err);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [content, shouldSave, projectId, documentId, activeChapterId, activeSceneId, debounceMs, onSaved]);
}