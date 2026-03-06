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
    if (!projectId || !documentId) {
      console.warn("Missing projectId or documentId → skipping outline fetch", { projectId, documentId });
      setLoading(false);
      setError("Missing project or document ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log(`Fetching outline: /projects/${projectId}/documents/${documentId}/outline`);
      const res = await api.get<DocumentOutline>(
        `/projects/${projectId}/documents/${documentId}/outline`
      );
      console.log("Outline fetched:", res.data);
      setOutline(res.data);
    } catch (err: any) {
      console.error("Outline fetch failed:", err);
      const status = err.response?.status;
      if (status === 401) {
        logout();
      } else if (status === 404) {
        setError("Document outline not found (404)");
      } else {
        setError(err.response?.data?.detail || "Failed to load document outline");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, documentId, logout]);

  useEffect(() => {
    reloadOutline();
  }, [reloadOutline]);

  return { outline, loading, error, reloadOutline };
}