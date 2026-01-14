// features/editor/hooks/useDocumentOutline.ts
import { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";
import { useAuth } from "../../../auth/useAuth";
import type { DocumentOutline } from "../../../types/document";

export function useDocumentOutline(
  projectId: string | undefined,
  documentId: string | undefined
) {
  const { logout } = useAuth();
  const [outline, setOutline] = useState<DocumentOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reloadOutline = useCallback(async () => {
    if (!projectId || !documentId) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.get<DocumentOutline>(
        `/projects/${projectId}/documents/${documentId}/outline`
      );
      setOutline(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 401) {
        logout();
      } else {
        setError("Failed to load document outline");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, documentId, logout]);

  useEffect(() => {
    reloadOutline();
  }, [reloadOutline]);

  return {
    outline,
    loading,
    error,
    reloadOutline,
  };
}