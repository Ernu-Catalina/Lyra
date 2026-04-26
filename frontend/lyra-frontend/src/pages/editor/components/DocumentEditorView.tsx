import { useMemo } from "react";
import { useDocumentSettings } from "../context/DocumentSettingsContext";
import { PaginatedPageView } from "./PaginatedPageView";
import { compileDocument } from "../utils/DocumentCompiler.ts";
import type { DocumentOutline } from "../../../types/document";
import { useState, useEffect } from "react";

interface DocumentEditorViewProps {
  outline: DocumentOutline;
  scale?: number;
}

/**
 * DocumentEditorView
 *
 * Read-only paginated view of the entire document.
 * Uses compileDocument to convert all chapters into pre-paginated HTML strings,
 * then passes them to PaginatedPageView for rendering.
 */
export function DocumentEditorView({ outline, scale = 1 }: DocumentEditorViewProps) {
  const { settings } = useDocumentSettings();

  const [pages, setPages] = useState<string[]>(() => compileDocument(outline, settings));

  useEffect(() => {
    const timer = setTimeout(() => {
      setPages(compileDocument(outline, settings));
    }, 400);
    return () => clearTimeout(timer);
  }, [outline, settings]);

  return <PaginatedPageView pages={pages} scale={scale} />;
}