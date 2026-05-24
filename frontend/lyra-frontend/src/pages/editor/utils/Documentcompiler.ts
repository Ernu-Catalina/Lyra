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

  let bodyPages: string[];

  if (settings.pageBreakAfterChapter) {
    bodyPages = compiledOutline.chapters.flatMap((chapter, i) =>
      compileChapter(chapter, settings, chapterNumbers[i])
    );
  } else {
    // Continuous flow — compile the entire document as one HTML string.
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
          ? `<div data-title="chapter" style="${styleObjectToCss(titleStyle)}">${escapeHtml(titleText)}</div>`
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

    bodyPages = paginateHtml(fullHtml, paginatorSettings);
  }

  if (!settings.includeTitlePage) return bodyPages;

  return [buildTitlePageHtml(settings), ...bodyPages];
}

/**
 * Build a single-page HTML string for the title page.
 * Rendered by PaginatedPageView as page index 0 — no page number band shown.
 *
 * Rules:
 *  - All text is forced to #000 (consistent print/export colour).
 *  - Font sizes come exclusively from titlePage* settings, never from defaultFontSize.
 *  - Author is prefixed with "By ".
 *  - Header and footer each have left / center / right cells.
 *  - font-size / line-height are set with !important so the page-content
 *    wrapper's inherited defaults cannot override them.
 */
function buildTitlePageHtml(settings: DocumentSettings): string {
  const titleText  = escapeHtml(settings.titlePageTitle  || "");
  const authorRaw  = escapeHtml(settings.titlePageAuthor || "");
  const authorText = authorRaw ? `By ${authorRaw}` : "";
  const align      = settings.titlePageAlignment;

  const titlePt  = settings.titlePageTitleFontSize;
  const authorPt = settings.titlePageAuthorFontSize;
  const headerPt = settings.titlePageHeaderFontSize;
  const footerPt = settings.titlePageFooterFontSize;

  const hL = nl2br(settings.titlePageHeaderLeft   || "");
  const hC = nl2br(settings.titlePageHeaderCenter || "");
  const hR = nl2br(settings.titlePageHeaderRight  || "");
  const fL = nl2br(settings.titlePageFooterLeft   || "");
  const fC = nl2br(settings.titlePageFooterCenter || "");
  const fR = nl2br(settings.titlePageFooterRight  || "");

  const hasHeader = hL || hC || hR;
  const hasFooter = fL || fC || fR;

  // Three-column band — align-items:flex-start so multi-line cells grow downward
  const band = (l: string, c: string, r: string, pt: number) =>
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;` +
    `font-size:${pt}pt!important;color:#000000;line-height:1.4;box-sizing:border-box;padding:4pt 0;">` +
    `<span style="flex:1;text-align:left;white-space:pre-wrap;word-break:break-word;">${l}</span>` +
    `<span style="flex:1;text-align:center;white-space:pre-wrap;word-break:break-word;">${c}</span>` +
    `<span style="flex:1;text-align:right;white-space:pre-wrap;word-break:break-word;">${r}</span>` +
    `</div>`;

  const headerBand = hasHeader ? band(hL, hC, hR, headerPt) : `<div></div>`;
  const footerBand = hasFooter ? band(fL, fC, fR, footerPt) : `<div></div>`;

  const titleHtml = titleText
    ? `<div style="font-size:${titlePt}pt!important;font-weight:bold;color:#000000;` +
      `text-align:${align};line-height:1.2;margin-bottom:${Math.round(authorPt * 0.5)}pt;">${titleText}</div>`
    : "";

  const authorHtml = authorText
    ? `<div style="font-size:${authorPt}pt!important;color:#000000;` +
      `text-align:${align};line-height:1.4;">${authorText}</div>`
    : "";

  return (
    // Reset all inherited typography — this div fills the padded content area (height:100%)
    `<div style="display:flex;flex-direction:column;height:100%;` +
    `font-size:${titlePt}pt!important;line-height:normal!important;text-indent:0!important;">` +
    headerBand +
    `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;` +
    `text-align:${align};gap:${Math.round(authorPt * 0.4)}pt;">` +
    titleHtml +
    authorHtml +
    `</div>` +
    footerBand +
    `</div>`
  );
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

function nl2br(str: string): string {
  return escapeHtml(str).replace(/\n/g, "<br>");
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
