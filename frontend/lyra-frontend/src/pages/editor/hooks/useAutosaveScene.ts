import { useCallback, useEffect, useRef } from "react";
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
  onStatusChange?: (status: "idle" | "saving" | "saved" | "error", message?: string) => void;
}

interface AutosaveResult {
  saveScene: () => Promise<void>;
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
  onStatusChange,
}: AutosaveProps): AutosaveResult {
  const timerRef = useRef<number | null>(null);
  const latestArgs = useRef({
    projectId,
    documentId,
    activeChapterId,
    activeSceneId,
    content,
    onSaved,
    onStatusChange,
  });

  useEffect(() => {
    latestArgs.current = {
      projectId,
      documentId,
      activeChapterId,
      activeSceneId,
      content,
      onSaved,
      onStatusChange,
    };
  }, [projectId, documentId, activeChapterId, activeSceneId, content, onSaved, onStatusChange]);

  const saveScene = useCallback(async () => {
    const {
      projectId: currentProjectId,
      documentId: currentDocumentId,
      activeChapterId: currentChapterId,
      activeSceneId: currentSceneId,
      content: currentContent,
      onSaved: currentOnSaved,
      onStatusChange: currentOnStatusChange,
    } = latestArgs.current;

    if (!currentProjectId || !currentDocumentId || !currentChapterId || !currentSceneId) {
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    currentOnStatusChange?.("saving", "Saving...");

    try {
      await api.put(
        `/projects/${currentProjectId}/documents/${currentDocumentId}/chapters/${currentChapterId}/scenes/${currentSceneId}`,
        { content: currentContent }
      );
      currentOnSaved?.(currentContent);
      currentOnStatusChange?.("saved", "Saved");
      window.setTimeout(() => currentOnStatusChange?.("idle"), 3000);
    } catch (err) {
      console.error("Autosave failed:", err);
      currentOnStatusChange?.("error", "Failed to save");
    }
  }, []);

  useEffect(() => {
    if (!shouldSave || !projectId || !documentId || !activeChapterId || !activeSceneId) {
      onStatusChange?.("idle");
      return;
    }

    timerRef.current = window.setTimeout(async () => {
      await saveScene();
      timerRef.current = null;
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [shouldSave, projectId, documentId, activeChapterId, activeSceneId, debounceMs, saveScene, onStatusChange]);

  return { saveScene };
}
