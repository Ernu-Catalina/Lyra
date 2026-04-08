import { composeChapter } from "../utils/chapterComposer";
import { useDocumentSettings } from "../context/DocumentSettingsContext";
import { getChapterTitleHTML } from "../utils/chapterTitleFormatter";
import type { DocumentOutline } from "../../../types/document";

interface DocumentEditorViewProps {
  outline: DocumentOutline;
}

export function DocumentEditorView({ outline }: DocumentEditorViewProps) {
  const settings = useDocumentSettings();

  const fullContent = outline.chapters
    .map((ch, index) => {
      const chapterTitleHtml = getChapterTitleHTML(ch.order, ch.title, settings);
      const chapterBodyHtml = composeChapter(ch.scenes);
      const breakHtml = settings.pageBreakAfterChapter && index < outline.chapters.length - 1 ? '<div class="page-break"></div>' : "";
      return `${chapterTitleHtml}${chapterBodyHtml}${breakHtml}`;
    })
    .join("");

  return (
    <div className="min-h-screen flex justify-center items-start bg-[var(--bg-primary)] py-8 px-4">
      <div
        className="bg-white w-full max-w-[1200px] min-h-[1100px] rounded-lg shadow-xl border border-[var(--border)] p-12 flex flex-col items-stretch"
        style={{
          fontFamily: settings.defaultFont,
          fontSize: `${settings.defaultFontSize}px`,
          textAlign: settings.defaultAlignment,
        }}
      >
        <h1 className="text-4xl font-bold mb-12">{outline.title}</h1>
        <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: fullContent }} />
        <p className="text-right mt-16 text-[var(--text-secondary)] text-sm">
          Total document length: {outline.total_wordcount.toLocaleString()} words
        </p>
      </div>
    </div>
  );
}