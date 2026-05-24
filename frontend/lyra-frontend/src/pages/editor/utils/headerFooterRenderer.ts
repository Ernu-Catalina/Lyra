/**
 * headerFooterRenderer.ts
 *
 * Resolves dynamic field tokens in header/footer strings and builds the
 * three-column HTML band (left | center | right) used by PaginatedPageView
 * and SceneEditorPageView.
 *
 * Page numbers belong exclusively to the footer section.  When showFooter is
 * false but showPageNumbers is true, a minimal footer band is rendered.
 *
 * Supported tokens:
 *   {title}       — document title
 *   {author}      — author name
 *   {page}        — current 1-based display page number (respects pageNumberStart)
 *   {totalPages}  — total page count
 */

import type { DocumentSettings } from "../context/DocumentSettingsContext";

export interface HeaderFooterContext {
  documentTitle: string;
  author: string;
  pageIndex: number;   // 0-based index of this page in the array
  totalPages: number;
}

function toRoman(n: number): string {
  if (n <= 0) return String(n);
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["m","cm","d","cd","c","xc","l","xl","x","ix","v","iv","i"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

function formatPageNumber(
  displayPage: number,
  totalPages: number,
  format: DocumentSettings["pageNumberFormat"]
): string {
  switch (format) {
    case "number-of-total": return `${displayPage} of ${totalPages}`;
    case "roman":           return toRoman(displayPage);
    default:                return String(displayPage);
  }
}

function resolveTokens(
  text: string,
  ctx: HeaderFooterContext,
  settings: DocumentSettings
): string {
  const displayPage = ctx.pageIndex + settings.pageNumberStart;
  const pageStr  = formatPageNumber(displayPage, ctx.totalPages, settings.pageNumberFormat);
  const totalStr = formatPageNumber(ctx.totalPages, ctx.totalPages, settings.pageNumberFormat);

  return text
    .replace(/\{title\}/g, ctx.documentTitle)
    .replace(/\{author\}/g, ctx.author)
    .replace(/\{page\}/g, pageStr)
    .replace(/\{totalPages\}/g, totalStr);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape HTML then convert newlines to <br> tags for multi-line cell content. */
function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

/**
 * Return the formatted page number for `side` on this page, or "" if it
 * doesn't belong here.  Page numbers always render in the footer.
 */
function resolvePageNumberCell(
  settings: DocumentSettings,
  ctx: HeaderFooterContext,
  side: "left" | "center" | "right"
): string {
  if (!settings.showPageNumbers) return "";

  const displayPage = ctx.pageIndex + settings.pageNumberStart;
  const isOdd = displayPage % 2 !== 0;

  let effectiveSide: "left" | "center" | "right";
  if (settings.pageNumberPosition === "alternating") {
    effectiveSide = isOdd ? "right" : "left";
  } else {
    effectiveSide = settings.pageNumberPosition;
  }

  if (effectiveSide !== side) return "";
  return formatPageNumber(displayPage, ctx.totalPages, settings.pageNumberFormat);
}

function buildBand(
  leftText: string,
  centerText: string,
  rightText: string,
  fontSize: number,
  fontFamily: string,
  borderSide: "bottom" | "top",
  showSeparator: boolean
): string {
  const border = showSeparator
    ? borderSide === "bottom"
      ? "border-bottom: 1px solid #ccc;"
      : "border-top: 1px solid #ccc;"
    : "";

  // align-items:flex-start so multi-line cells start at the top of the band
  const cell = (align: string, text: string) =>
    `<span style="flex:1;text-align:${align};overflow:hidden;white-space:pre-wrap;word-break:break-word;">${nl2br(text)}</span>`;

  // padding: 6px 0 gives the band comfortable vertical breathing room
  return (
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;` +
    `font-family:${fontFamily};font-size:${fontSize}pt;color:#555;${border}padding:6px 0;` +
    `line-height:1.4;box-sizing:border-box;min-height:100%;">` +
    cell("left", leftText) +
    cell("center", centerText) +
    cell("right", rightText) +
    `</div>`
  );
}

export function buildHeaderHtml(
  settings: DocumentSettings,
  ctx: HeaderFooterContext
): string {
  if (!settings.showHeader) return "";

  const sep = settings.showHeaderFooterSeparator;
  const left   = resolveTokens(settings.headerLeft,   ctx, settings);
  const center = resolveTokens(settings.headerCenter, ctx, settings);
  const right  = resolveTokens(settings.headerRight,  ctx, settings);

  return buildBand(left, center, right, settings.headerFontSize, settings.defaultFont, "bottom", sep);
}

export function buildFooterHtml(
  settings: DocumentSettings,
  ctx: HeaderFooterContext
): string {
  const hasFooterText = settings.showFooter;
  const hasPageNum    = settings.showPageNumbers;

  if (!hasFooterText && !hasPageNum) return "";

  const sep = settings.showHeaderFooterSeparator;

  // Resolve footer text cells
  const footerL = hasFooterText ? resolveTokens(settings.footerLeft,   ctx, settings) : "";
  const footerC = hasFooterText ? resolveTokens(settings.footerCenter, ctx, settings) : "";
  const footerR = hasFooterText ? resolveTokens(settings.footerRight,  ctx, settings) : "";

  // Overlay page numbers into the correct cell (page number wins over empty, footer text wins over page number)
  const left   = footerL || resolvePageNumberCell(settings, ctx, "left");
  const center = footerC || resolvePageNumberCell(settings, ctx, "center");
  const right  = footerR || resolvePageNumberCell(settings, ctx, "right");

  const fontSize = hasFooterText
    ? settings.footerFontSize
    : settings.pageNumberFontSize;

  return buildBand(left, center, right, fontSize, settings.defaultFont, "top", sep);
}
