import { useMemo } from "react";
import { useDocumentSettings } from "../context/DocumentSettingsContext";
import { PaginatedPageView } from "./PaginatedPageView";
import { compileChapter } from "../utils/chapterCompiler";
import type { Chapter } from "../../../types/document";

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

  const pages = useMemo(
    () => compileChapter(chapter, settings),
    [chapter, settings]
  );

  return <PaginatedPageView pages={pages} scale={scale} />;
}