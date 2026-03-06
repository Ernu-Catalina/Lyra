// src/pages/editor/components/WordCountFooter.tsx
import { formatWordCount } from "../utils/wordcount";

interface WordCountFooterProps {
  sceneCount: number;
  chapterCount: number;
  documentCount: number;
}

export function WordCountFooter({ sceneCount, chapterCount, documentCount }: WordCountFooterProps) {
  // For now hard-coded; later read from user settings
  const showScene    = true;
  const showChapter  = true;
  const showDocument = true;

  const parts: string[] = [];

  if (showScene)    parts.push(`Scene: ${formatWordCount(sceneCount, "exact")}`);
  if (showChapter)  parts.push(`Chapter: ${formatWordCount(chapterCount, "exact")}`);
  if (showDocument) parts.push(`Document: ${formatWordCount(documentCount, "exact")}`);

  if (parts.length === 0) return null;

  return (
    <div className="text-center text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)]/60">
      {parts.join("  |  ")}
    </div>
  );
}