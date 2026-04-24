/**
 * PaginatedPageView
 *
 * Renders an array of pre-computed HTML page strings as paginated pages.
 * Each string is a complete HTML fragment for exactly one page, produced
 * by chapterCompiler or documentCompiler via htmlPaginator.
 *
 * This component is purely presentational — no measurement, no clipping,
 * no shared children across pages. Each page renders its own isolated HTML.
 */

import { useDocumentSettings, type DocumentSettings } from "../context/DocumentSettingsContext";

interface PaginatedPageViewProps {
  pages: string[];
  scale?: number;
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

export function PaginatedPageView({ pages, scale = 1 }: PaginatedPageViewProps) {
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

  const pageCount    = Math.max(pages.length, 1);
  const totalHeightPx = pageCount * pageHeightPx + (pageCount - 1) * GAP_PX;

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px",
        boxSizing: "border-box",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      {/* Reserves correct scaled space in layout flow */}
      <div
        style={{
          width: pageWidthPx * scale,
          height: totalHeightPx * scale,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Full-size inner div scaled from top-left */}
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
          {pages.map((pageHtml, i) => (
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
                paddingTop: marginTopPx,
                paddingLeft: marginLeftPx,
                paddingRight: marginRightPx,
                fontFamily: settings.defaultFont,
                fontSize: `${settings.defaultFontSize}pt`,
                lineHeight: settings.defaultLineHeight,
                color: "var(--text-primary)",
                "--default-first-line-indent": settings.defaultFirstLineIndent > 0
                  ? `${settings.defaultFirstLineIndent}${settings.defaultFirstLineIndentUnit}`
                  : "0",
                } as React.CSSProperties
              }
              dangerouslySetInnerHTML={{ __html: pageHtml }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}