import type { Scene } from "../types/document";

const SEPARATOR = `<p style="text-align:center;">***</p>`;

export function composeChapter(scenes: Scene[]): string {
  const ordered = [...scenes].sort(
    (a, b) => a.order - b.order
  );

  return ordered
    .map(sceneContentOrEmpty)
    .join(SEPARATOR);
}

function sceneContentOrEmpty(scene: Scene): string {
  return scene.content ?? "";
}

export function splitChapterContent(html: string): string[] {
  return html.split(/<p[^>]*>\s*\*\*\*\s*<\/p>/i);
}
