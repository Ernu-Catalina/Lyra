import { composeChapter } from "../utils/chapterComposer";
import type { DocumentOutline } from "../../../types/document";

interface DocumentEditorViewProps {
  outline: DocumentOutline;
}

export function DocumentEditorView({ outline }: DocumentEditorViewProps) {
  const fullContent = outline.chapters
    .map((ch) => `<h2>${ch.title}</h2>${composeChapter(ch.scenes)}`)
    .join("\n\n");

  return (
    <div className="prose prose-invert max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-12">{outline.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: fullContent }} />
      <p className="text-right mt-16 text-[var(--text-secondary)] text-sm">
        Total document length: {outline.total_wordcount.toLocaleString()} words
      </p>
    </div>
  );
}