import { useMemo } from "react";
import { useDocumentSettings } from "../context/DocumentSettingsContext";
import { PaginatedPageView } from "./PaginatedPageView";
import { compileDocument } from "../utils/documentCompiler";
import type { DocumentOutline } from "../../../types/document";

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

  const pages = useMemo(
    () => compileDocument(outline, settings),
    [outline, settings]
  );

  return <PaginatedPageView pages={pages} scale={scale} />;
}