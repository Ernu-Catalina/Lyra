// src/utils/chapterComposer.ts
import type { Scene } from "../../../types/document";

const SEPARATOR = `<p style="text-align: center; padding: 1rem 0; margin: 0;">* * *</p>`;

export function composeChapter(scenes: Scene[]): string {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);

  // Join scenes with centered ***** separator
  return ordered
    .map((scene) => scene.content || "")
    .filter(Boolean) // skip empty scenes
    .join(SEPARATOR);
}

// Optional: reverse function (for saving if you implement chapter editing later)
export function splitChapterContent(html: string): string[] {
  return html.split(/<p[^>]*>\s*\*\*\*\*\*\s*<\/p>/i);
}