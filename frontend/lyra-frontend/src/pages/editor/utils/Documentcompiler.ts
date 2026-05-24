/**
 * Documentcompiler.ts
 */

import type { DocumentOutline } from "../../../types/document";
import type { DocumentSettings } from "../context/DocumentSettingsContext";
import { compileChapter } from "./Chaptercompiler";
import { paginateHtml, type PaginatorSettings } from "./Htmlpaginator";
import { composeChapter } from "./chapterComposer";
import { formatChapterTitle } from "./chapterTitleFormatter";
import { getReorderedOutline, isSpecialSectionTitle } from "./specialSections";

function injectSpecialSections(outline: DocumentOutline, settings: DocumentSettings): DocumentOutline {
  return getReorderedOutline(outline, settings);
}

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
 * Compiles an entire document into paginated HTML page strings.
 *
 * @param outline  - The full DocumentOutline (may be raw or pre-filtered)
 * @param settings - DocumentSettings
 * @returns        - Array of HTML strings, one per page
 */
export function compileDocument(
  outline: DocumentOutline,
  settings: DocumentSettings
): string[] {
  // Always work from the canonically ordered, visibility-filtered outline so
  // disabled special sections are excluded and order is Prologue→chapters→
  // Epilogue→Acknowledgements regardless of the raw DB order field.
  const compiledOutline = injectSpecialSections(outline, settings);
  if (compiledOutline.chapters.length === 0) return [""];

  // Pre-compute each chapter's 1-based sequential number once.
  // Special sections (Prologue, Epilogue, Acknowledgements) are assigned 0
  // so formatChapterTitle knows to omit any numeric prefix.
  let normalCount = 0;
  const chapterNumbers = compiledOutline.chapters.map((chapter) => {
    if (isSpecialSectionTitle(chapter.title)) return 0;
    normalCount += 1;
    return normalCount;
  });

  console.log(
    "[compileDocument] chapter order:",
    compiledOutline.chapters.map((ch, i) => `${ch.title} → #${chapterNumbers[i]}`)
  );

  if (settings.pageBreakAfterChapter) {
    // Each chapter starts on its own page. Pass the pre-computed number so
    // compileChapter never has to guess from the raw order field.
    return compiledOutline.chapters.flatMap((chapter, i) =>
      compileChapter(chapter, settings, chapterNumbers[i])
    );
  }

  // Continuous flow — compile the entire document as one HTML string
  // so text flows naturally across chapter boundaries.
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

  const fullHtml = compiledOutline.chapters
    .map((chapter, i) => {
      const { html: titleText, style: titleStyle } = formatChapterTitle(
        chapterNumbers[i],
        chapter.title,
        settings
      );

      const titleHtml = titleText
        ? `<div style="${styleObjectToCss(titleStyle)}">${escapeHtml(titleText)}</div>`
        : "";

      return titleHtml + composeChapter(chapter.scenes, settings, isSpecialSectionTitle(chapter.title));
    })
    .join("");

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
