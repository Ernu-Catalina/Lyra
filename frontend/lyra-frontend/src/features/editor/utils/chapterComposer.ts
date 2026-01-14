// features/editor/utils/chapterComposer.ts
import type { Scene } from "../../../types/document";

const SEPARATOR = `<p style="text-align:center;">***</p>`;

export function composeChapter(scenes: Scene[]): string {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  return ordered.map((s) => s.content ?? "").join(SEPARATOR);
}

export function splitChapterContent(html: string): string[] {
  return html.split(/<p[^>]*>\s*\*\*\*\s*<\/p>/i);
}