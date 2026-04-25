import { type ReactNode } from "react";
import { useDocumentSettings, type DocumentSettings } from "../../context/DocumentSettingsContext";

interface SceneEditorPageViewProps {
  children: ReactNode;
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
function mmToPx(mm: number) { return mm * MM_TO_PX; }
function convertToMm(value: number, unit: "mm" | "cm" | "in") {
  if (unit === "cm") return value * 10;
  if (unit === "in") return value * 25.4;
  return value;
}

/**
 * SceneEditorPageView
 *
 * Wraps the scene editor in a single continuous "paper" surface.
 * No pagination — the page grows with content.
 * Margins are applied as padding so the editor respects page boundaries visually.
 * Chapter and Document views have their own paginated renderer (PaginatedPageView).
 */
export function SceneEditorPageView({ children, scale = 1 }: SceneEditorPageViewProps) {
  const { settings } = useDocumentSettings();

  const paperSize =
    settings.paperFormat === "Custom"
      ? { width: settings.customWidth, height: settings.customHeight }
      : PAPER_SIZES[settings.paperFormat];

  const pageWidthPx  = mmToPx(paperSize.width);
  const marginTopPx  = mmToPx(convertToMm(settings.marginTop,    settings.marginUnit));
  const marginBotPx  = mmToPx(convertToMm(settings.marginBottom, settings.marginUnit));
  const marginLeftPx = mmToPx(convertToMm(settings.marginLeft,   settings.marginUnit));
  const marginRightPx= mmToPx(convertToMm(settings.marginRight,  settings.marginUnit));

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
      {/* Outer wrapper reserves correct scaled width */}
      <div
        style={{
          width: pageWidthPx * scale,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Inner wrapper applies scale transform from top-left */}
        <div
          style={{
            width: pageWidthPx,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          {/* Paper surface — grows with content, no fixed height */}
          <div
            className="page-container"
            style={{
              width: pageWidthPx,
              background: "var(--bg-secondary)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              borderRadius: 2,
              boxSizing: "border-box",
              paddingTop: marginTopPx,
              paddingBottom: marginBotPx,
              paddingLeft: marginLeftPx,
              paddingRight: marginRightPx,
              fontFamily: settings.defaultFont,
              fontSize: `${settings.defaultFontSize}pt`,
              lineHeight: settings.defaultLineHeight,
              textAlign: settings.defaultAlignment as any,
              "--default-first-line-indent": settings.defaultFirstLineIndent > 0
                ? `${settings.defaultFirstLineIndent}${settings.defaultFirstLineIndentUnit}`
                : "0",
              textIndent: "var(--default-first-line-indent, 0)",
            } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}