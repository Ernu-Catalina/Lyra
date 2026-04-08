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
    <div className="min-h-screen flex justify-center items-start bg-[var(--bg-primary)] py-8">
      <div className="bg-white w-[800px] min-h-[1100px] rounded-lg shadow-xl border border-gray-200 p-12 flex flex-col items-stretch">
        <h1 className="text-4xl font-bold mb-12">{outline.title}</h1>
        <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: fullContent }} />
        <p className="text-right mt-16 text-[var(--text-secondary)] text-sm">
          Total document length: {outline.total_wordcount.toLocaleString()} words
        </p>
      </div>
    </div>
  );
}