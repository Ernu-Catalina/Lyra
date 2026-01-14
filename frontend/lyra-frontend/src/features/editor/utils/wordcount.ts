// features/editor/utils/wordcount.ts
/**
 * Simple word count utility.
 * Counts words in plain text or HTML (strips tags roughly).
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;

  // Very basic HTML strip — good enough for most editor content
  const plain = text
    .replace(/<[^>]+>/g, " ")           // remove tags
    .replace(/\s+/g, " ")               // collapse whitespace
    .trim();

  if (!plain) return 0;

  return plain.split(" ").filter(Boolean).length;
}

/**
 * More accurate version if using TipTap/ProseMirror JSON or HTML
 * (you can improve this later with better parsing)
 */
export function countWordsFromHtml(html: string): number {
  // For now, same as above — can later use DOMParser or TipTap helpers
  return countWords(html);
}

/**
 * Estimate word count delta after edit (optimistic UI / autosave preview)
 */
export function estimateWordDelta(
  previous: string,
  current: string
): number {
  return countWordsFromHtml(current) - countWordsFromHtml(previous);
}