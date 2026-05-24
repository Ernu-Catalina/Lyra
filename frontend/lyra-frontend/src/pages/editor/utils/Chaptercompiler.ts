/**
 * chapterCompiler.ts
 *
 * Converts a Chapter into an array of HTML strings, one per page,
 * ready to render in ChapterEditorView with dangerouslySetInnerHTML.
 *
 * Prepends the formatted chapter title to the composed scene HTML,
 * then delegates pagination to htmlPaginator.
 */

import type { Chapter } from "../../../types/document";
import type { DocumentSettings } from "../context/DocumentSettingsContext";
import { composeChapter } from "./chapterComposer";
import { formatChapterTitle } from "./chapterTitleFormatter";
import { isSpecialSectionTitle } from "./specialSections";
import { paginateHtml, type PaginatorSettings } from "./Htmlpaginator";

const MM_TO_PX = 3.7795275591;
function mmToPx(mm: number) { return mm * MM_TO_PX; }
function convertToMm(value: number, unit: "mm" | "cm" | "in") {
  if (unit === "cm") return value * 10;
  if (unit === "in") return value * 25.4;
  return value;
}

const PAPER_SIZES: Record<DocumentSettings["paperFormat"], { width: number; height: number }> = {
  A4:     { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  A5:     { width: 148, height: 210 },
  Legal:  { width: 215.9, height: 355.6 },
  Custom: { width: 210, height: 297 },
};

/**
 * Compiles a chapter into paginated HTML page strings.
 *
 * @param chapter       - The Chapter object with scenes
 * @param settings      - DocumentSettings (margins, font, paper size, etc.)
 * @param chapterNumber - 1-based sequential number for normal chapters; pass 0
 *                        for special sections (Prologue / Epilogue / etc.) so
 *                        they are never prefixed with a number.  When omitted
 *                        the function derives a best-effort value from the
 *                        chapter's raw `order` field — callers should always
 *                        pass an explicit value to guarantee correctness.
 * @returns - Array of HTML strings, one per page
 */
export function compileChapter(
  chapter: Chapter,
  settings: DocumentSettings,
  chapterNumber?: number
): string[] {
  const paperSize =
    settings.paperFormat === "Custom"
      ? { width: settings.customWidth, height: settings.customHeight }
      : PAPER_SIZES[settings.paperFormat];

  const pageWidthPx    = mmToPx(paperSize.width);
  const pageHeightPx   = mmToPx(paperSize.height);
  const marginTopPx    = mmToPx(convertToMm(settings.marginTop,    settings.marginUnit));
  const marginBottomPx = mmToPx(convertToMm(settings.marginBottom, settings.marginUnit));
  const marginLeftPx   = mmToPx(convertToMm(settings.marginLeft,   settings.marginUnit));
  const marginRightPx  = mmToPx(convertToMm(settings.marginRight,  settings.marginUnit));

  // Resolve the display number:
  // - Special sections never get a number (pass 0 → formatChapterTitle ignores it).
  // - If an explicit number was given, use it.
  // - Fallback: treat the raw order field as 0-based and add 1. This is a
  //   best-effort path used only when ChapterEditorView calls us without
  //   knowing the full document context; the result may be wrong when special
  //   sections have shifted the order field, but it will never affect the
  //   document or export views which always pass an explicit number.
  const isSpecial = isSpecialSectionTitle(chapter.title);
  const resolvedNumber = isSpecial ? 0 : (chapterNumber ?? chapter.order + 1);

  // Build the full HTML: title block + scene content
  const { html: titleText, style: titleStyle } = formatChapterTitle(
    resolvedNumber,
    chapter.title,
    settings
  );

  const titleHtml = titleText
    ? `<div data-title="chapter" style="${styleObjectToCss(titleStyle)}">${escapeHtml(titleText)}</div>`
    : "";

  const bodyHtml = composeChapter(chapter.scenes, settings, isSpecial);
  const fullHtml = titleHtml + bodyHtml;

  const paginatorSettings: PaginatorSettings = {
    pageWidthPx,
    pageHeightPx,
    marginTopPx,
    marginBottomPx,
    marginLeftPx,
    marginRightPx,
    fontFamily: settings.defaultFont,
    fontSize: `${settings.defaultFontSize}pt`,
    lineHeight: settings.defaultLineHeight,
    paragraphSpacing: settings.defaultParagraphSpacing,
    textAlign: settings.defaultAlignment,
    firstLineIndent: settings.defaultFirstLineIndent > 0
  ? `${settings.defaultFirstLineIndent}${settings.defaultFirstLineIndentUnit}`
  : "0",
  };

  return paginateHtml(fullHtml, paginatorSettings);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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