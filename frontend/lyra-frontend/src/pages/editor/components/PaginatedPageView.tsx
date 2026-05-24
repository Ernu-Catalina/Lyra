/**
 * PaginatedPageView
 *
 * Renders pre-computed HTML pages without extra scroll space at the end.
 * When headers/footers are enabled in DocumentSettings, each page gets
 * absolutely-positioned bands inside the margin zone at top/bottom.
 *
 * Layout contract:
 *   - The band height is HF_BAND_PX and sits HF_INSET_PX from the page edge.
 *   - Content padding equals the full margin so body text never overlaps the band.
 *     (The margin must be large enough to contain HF_INSET_PX + HF_BAND_PX.)
 */

import { useDocumentSettings, type DocumentSettings } from "../context/DocumentSettingsContext";
import { buildHeaderHtml, buildFooterHtml } from "../utils/headerFooterRenderer";

interface PaginatedPageViewProps {
  pages: string[];
  scale?: number;
  documentTitle?: string;
  author?: string;
  /** When false, header/footer bands are suppressed regardless of settings (e.g. Chapter view). */
  showHeaderFooter?: boolean;
}

const PAPER_SIZES: Record<DocumentSettings["paperFormat"], { width: number; height: number }> = {
  A4:     { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  A5:     { width: 148, height: 210 },
  Legal:  { width: 215.9, height: 355.6 },
  Custom: { width: 210, height: 297 },
};

const MM_TO_PX = 3.7795275591;
const GAP_PX = 24;

function mmToPx(mm: number) { return mm * MM_TO_PX; }
function convertToMm(value: number, unit: "mm" | "cm" | "in") {
  if (unit === "cm") return value * 10;
  if (unit === "in") return value * 25.4;
  return value;
}

// Band height in px — two comfortable lines at ~10pt with padding
const HF_BAND_PX = 44;
// Distance from page edge to the outer edge of the band
const HF_INSET_PX = 10;

export function PaginatedPageView({ pages, scale = 1, documentTitle = "", author = "", showHeaderFooter = true }: PaginatedPageViewProps) {
  const { settings } = useDocumentSettings();

  const paperSize =
    settings.paperFormat === "Custom"
      ? { width: settings.customWidth, height: settings.customHeight }
      : PAPER_SIZES[settings.paperFormat];

  const pageWidthPx   = mmToPx(paperSize.width);
  const pageHeightPx  = mmToPx(paperSize.height);
  const marginTopPx   = mmToPx(convertToMm(settings.marginTop,    settings.marginUnit));
  const marginBotPx   = mmToPx(convertToMm(settings.marginBottom, settings.marginUnit));
  const marginLeftPx  = mmToPx(convertToMm(settings.marginLeft,   settings.marginUnit));
  const marginRightPx = mmToPx(convertToMm(settings.marginRight,  settings.marginUnit));

  const hasHeader = showHeaderFooter && settings.showHeader;
  const hasFooter = showHeaderFooter && (settings.showFooter || settings.showPageNumbers);

  const totalPages = Math.max(pages.length, 1);
  const pageCount  = totalPages;
  const totalHeightPx = pageCount * pageHeightPx + (pageCount - 1) * GAP_PX;

  return (
    <div
      className="page-container"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px",
        boxSizing: "border-box",
        backgroundColor: "var(--bg-primary)",
        minHeight: "100%",
      }}
    >
      <div
        style={{
          width: pageWidthPx * scale,
          height: totalHeightPx * scale,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: pageWidthPx,
            height: totalHeightPx,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          {pages.map((pageHtml, i) => {
            // Title page (index 0 when includeTitlePage is on) gets no H/F bands
            // and doesn't count toward the page number sequence.
            const isTitlePage = showHeaderFooter && settings.includeTitlePage && i === 0;
            // Body pages shift their display index when a title page is present
            const bodyPageIndex = settings.includeTitlePage ? i - 1 : i;
            const ctx = {
              documentTitle,
              author,
              // pageIndex drives the displayed page number; title page never shows one
              pageIndex: bodyPageIndex,
              totalPages: settings.includeTitlePage ? totalPages - 1 : totalPages,
            };
            const headerHtml = (hasHeader && !isTitlePage) ? buildHeaderHtml(settings, ctx) : "";
            const footerHtml = (hasFooter && !isTitlePage) ? buildFooterHtml(settings, ctx) : "";

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: i * (pageHeightPx + GAP_PX),
                  left: 0,
                  width: pageWidthPx,
                  height: pageHeightPx,
                  background: "var(--bg-secondary)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                  borderRadius: 2,
                  overflow: "hidden",
                  boxSizing: "border-box",
                }}
              >
                {/* Header band — floats inside top margin, never overlaps body */}
                {headerHtml && (
                  <div
                    style={{
                      position: "absolute",
                      top: HF_INSET_PX,
                      left: marginLeftPx,
                      right: marginRightPx,
                      height: HF_BAND_PX,
                    }}
                    dangerouslySetInnerHTML={{ __html: headerHtml }}
                  />
                )}

                {/* Body content — full margins always honoured */}
                <div
                  className="page-content"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    boxSizing: "border-box",
                    paddingTop: marginTopPx,
                    paddingBottom: marginBotPx,
                    paddingLeft: marginLeftPx,
                    paddingRight: marginRightPx,
                    fontFamily: settings.defaultFont,
                    fontSize: `${settings.defaultFontSize}pt`,
                    lineHeight: `${settings.defaultLineHeight}`,
                    "--page-font-family": settings.defaultFont,
                    "--page-font-size": `${settings.defaultFontSize}pt`,
                    "--page-line-height": `${settings.defaultLineHeight}`,
                    "--page-paragraph-spacing": `${settings.defaultParagraphSpacing}pt`,
                    color: "var(--text-primary)",
                    "--default-first-line-indent": settings.defaultFirstLineIndent > 0
                      ? `${settings.defaultFirstLineIndent}${settings.defaultFirstLineIndentUnit}`
                      : "0",
                    textIndent: "var(--default-first-line-indent, 0)",
                    overflow: "hidden",
                  } as React.CSSProperties}
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
                />

                {/* Footer band — floats inside bottom margin, never overlaps body */}
                {footerHtml && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: HF_INSET_PX,
                      left: marginLeftPx,
                      right: marginRightPx,
                      height: HF_BAND_PX,
                    }}
                    dangerouslySetInnerHTML={{ __html: footerHtml }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
