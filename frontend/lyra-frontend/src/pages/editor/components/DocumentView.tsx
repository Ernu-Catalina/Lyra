// src/pages/editor/components/DocumentView.tsx
import type { DocumentOutline } from "../../../types/document";
import { composeChapter } from "../utils/chapterComposer";

interface DocumentViewProps {
  outline: DocumentOutline;
}

export function DocumentView({ outline }: DocumentViewProps) {
  const total = outline.total_wordcount || 0;
  const composed = outline.chapters.map(ch => composeChapter(ch.scenes)).join("\n\n");

  return (
    <div className="prose prose-invert max-w-none p-8">
      <h1 className="text-3xl font-bold mb-8">{outline.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: composed }} />
      <p className="text-right text-sm text-[var(--text-secondary)] mt-12">
        Total document length: {total.toLocaleString()} words
      </p>
    </div>
  );
}