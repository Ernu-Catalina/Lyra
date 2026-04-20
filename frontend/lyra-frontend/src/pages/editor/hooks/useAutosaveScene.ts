// src/pages/editor/hooks/useAutosaveScene.ts
import { useEffect } from "react";
import api from "../../../api/client";
import { stripSpacersFromHtml } from "../extensions/PageBreakSpacer";

interface AutosaveProps {
  projectId?: string;
  documentId?: string;
  activeChapterId?: string;
  activeSceneId?: string;
  content: string;
  shouldSave: boolean;
  debounceMs?: number;
  onSaved?: (savedContent: string) => void;
  onStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error', message?: string) => void;
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
}: AutosaveProps) {
  useEffect(() => {
    if (!shouldSave || !projectId || !documentId || !activeChapterId || !activeSceneId) {
      onStatusChange?.('idle');
      return;
    }

    onStatusChange?.('saving', 'Saving scene...');

    const timer = setTimeout(async () => {
      try {
        await api.put(
          `/projects/${projectId}/documents/${documentId}/chapters/${activeChapterId}/scenes/${activeSceneId}`,
          { content: stripSpacersFromHtml(content) }
        );
        onSaved?.(content);
        onStatusChange?.('saved', 'Saved');
        setTimeout(() => onStatusChange?.('idle'), 3000); // fade out success
      } catch (err) {
        console.error("Autosave failed:", err);
        onStatusChange?.('error', 'Failed to save');
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      onStatusChange?.('idle');
    };
  }, [content, shouldSave, projectId, documentId, activeChapterId, activeSceneId, debounceMs, onSaved, onStatusChange]);
}