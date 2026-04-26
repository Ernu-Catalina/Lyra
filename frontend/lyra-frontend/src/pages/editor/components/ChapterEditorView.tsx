import { useMemo } from "react";
import { useDocumentSettings } from "../context/DocumentSettingsContext";
import { PaginatedPageView } from "./PaginatedPageView";
import { compileChapter } from "../utils/ChapterCompiler";
import type { Chapter } from "../../../types/document";
import { useState, useEffect } from "react";

interface ChapterEditorViewProps {
  chapter: Chapter;
  scale?: number;
}

/**
 * ChapterEditorView
 *
 * Read-only paginated view of a single chapter.
 * Uses compileChapter to convert the chapter into pre-paginated HTML strings,
 * then passes them to PaginatedPageView for rendering.
 */
export function ChapterEditorView({ chapter, scale = 1 }: ChapterEditorViewProps) {
  const { settings } = useDocumentSettings();

  const [pages, setPages] = useState<string[]>(() => compileChapter(chapter, settings));

  useEffect(() => {
    const timer = setTimeout(() => {
      setPages(compileChapter(chapter, settings));
    }, 400);
    return () => clearTimeout(timer);
  }, [chapter, settings]);

  return <PaginatedPageView pages={pages} scale={scale} />;
}