// src/utils/chapterComposer.ts
import type { Scene } from "../../../types/document";
import type { DocumentSettings } from "../context/DocumentSettingsContext";
import { formatSceneTitle } from "./chapterTitleFormatter";

const SEPARATOR = `<p style="text-align: center; padding: 1rem 0; margin: 0;">* * *</p>`;

function styleObjectToCss(style: React.CSSProperties): string {
  const unitless = new Set([
    "lineHeight", "fontWeight", "opacity", "zIndex", "flexGrow",
    "flexShrink", "order", "zoom", "columnCount",
  ]);
  return Object.entries(style)
    .filter(([, v]) => v != null)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      const cssValue =
        typeof value === "number" && !unitless.has(key) ? `${value}px` : value;
      return `${cssKey}: ${cssValue}`;
    })
    .join("; ");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function composeChapter(scenes: Scene[], settings?: DocumentSettings): string {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  const nonEmpty = ordered.filter((s) => s.content);

  if (nonEmpty.length === 0) return "";

  const showTitles = settings?.showSceneTitles ?? false;

  if (showTitles) {
    // Scene titles mode: prepend formatted title to each scene, no separator
    return nonEmpty
      .map((scene, i) => {
        const { html: titleText, style: titleStyle } = formatSceneTitle(
          i + 1,
          scene.title,
          settings!
        );
        const titleHtml = titleText
          ? `<div style="${styleObjectToCss(titleStyle)}">${escapeHtml(titleText)}</div>`
          : "";
        return titleHtml + (scene.content ?? "");
      })
      .join("");
  }

  // Default mode: join scenes with * * * separator
  return nonEmpty
    .map((scene) => scene.content ?? "")
    .join(SEPARATOR);
}

// Optional: reverse function (for saving if you implement chapter editing later)
export function splitChapterContent(html: string): string[] {
  return html.split(/<p[^>]*>\s*\*\*\*\*\*\s*<\/p>/i);
}
