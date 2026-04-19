import { type ReactNode, useEffect, useRef, useState } from "react";
import { useDocumentSettings, type DocumentSettings } from "../../context/DocumentSettingsContext";

interface SceneEditorPageViewProps {
  children: ReactNode;
  scale?: number;
}

const VISUAL_CORRECTION = 1;

const PAPER_SIZES: Record<DocumentSettings["paperFormat"], { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  A5: { width: 148, height: 210 },
  Legal: { width: 215.9, height: 355.6 },
  Custom: { width: 210, height: 297 },
};

const MM_TO_PX = 3.7795275591;

function mmToPx(mm: number) {
  return mm * MM_TO_PX;
}

function convertToMm(value: number, unit: "mm" | "cm" | "in") {
  if (unit === "cm") return value * 10;
  if (unit === "in") return value * 25.4;
  return value;
}

export function SceneEditorPageView({ children, scale = 1 }: SceneEditorPageViewProps) {
  const { settings } = useDocumentSettings();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousPageCountRef = useRef(1);
  const [pageCount, setPageCount] = useState(1);

  const paperSize =
    settings.paperFormat === "Custom"
      ? { width: settings.customWidth, height: settings.customHeight }
      : PAPER_SIZES[settings.paperFormat];

  const marginTopMm = convertToMm(settings.marginTop, settings.marginUnit);
  const marginBottomMm = convertToMm(settings.marginBottom, settings.marginUnit);
  const marginLeftMm = convertToMm(settings.marginLeft, settings.marginUnit);
  const marginRightMm = convertToMm(settings.marginRight, settings.marginUnit);

  const pageWidthMm = paperSize.width;
  const pageHeightMm = paperSize.height;
  const pageWidthPx = mmToPx(pageWidthMm);
  const pageHeightPx = mmToPx(pageHeightMm);
  const marginTopPx = mmToPx(marginTopMm);
  const marginBottomPx = mmToPx(marginBottomMm);
  const marginLeftPx = mmToPx(marginLeftMm);
  const marginRightPx = mmToPx(marginRightMm);

  const GAP = 24;
  const GAP_MM = GAP / MM_TO_PX;

  const effectiveScale = scale;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const rawContentHeight = el.scrollHeight;
      const actualContentHeight = rawContentHeight - (previousPageCountRef.current - 1) * GAP;
      const usablePageHeight = pageHeightPx - marginTopPx - marginBottomPx;
      const pages = Math.max(1, Math.ceil(actualContentHeight / usablePageHeight));

      if (pages !== pageCount) {
        setPageCount(pages);
        previousPageCountRef.current = pages;
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageHeightPx, marginTopPx, marginBottomPx, pageCount]);

  const totalHeightMm = pageCount * pageHeightMm + (pageCount - 1) * GAP_MM;
  const totalHeightPx = totalHeightMm * MM_TO_PX;

  const scaledWidth = pageWidthPx * effectiveScale;
  const scaledTotalHeight = totalHeightPx * effectiveScale;

  const correctedFontSize = settings.defaultFontSize * VISUAL_CORRECTION;

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: scaledWidth, height: scaledTotalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${pageWidthMm}mm`,
            height: `${totalHeightMm}mm`,
            transformOrigin: "top left",
            transform: `scale(${effectiveScale})`,
          }}
        >
          {/* Page backgrounds */}
          {Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${i * (pageHeightMm + GAP_MM)}mm`,
                left: 0,
                width: `${pageWidthMm}mm`,
                height: `${pageHeightMm}mm`,
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                borderRadius: 2,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Gap covers */}
          {Array.from({ length: pageCount - 1 }).map((_, i) => (
            <div
              key={`gap-${i}`}
              style={{
                position: "absolute",
                top: `${(i + 1) * pageHeightMm + i * GAP_MM}mm`,
                left: "-40px",
                width: `calc(${pageWidthMm}mm + 80px)`,
                height: `${GAP_MM}mm`,
                background: "#C8C8C8",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Editor content */}
          <div
            ref={contentRef}
            className="page-container"
            style={{
             position: "absolute",
             top: 0,
             left: 0,
             width: `${pageWidthMm}mm`,
             zIndex: 1,
             boxSizing: "border-box",
             paddingTop: `${marginTopMm}mm`,
             paddingLeft: `${marginLeftMm}mm`,
             paddingRight: `${marginRightMm}mm`,
             paddingBottom: `${marginBottomMm + (pageCount - 1) * GAP_MM}mm`,
             fontFamily: settings.defaultFont,
             fontSize: `${correctedFontSize}pt`,
             textAlign: settings.defaultAlignment,
             "--default-first-line-indent": settings.defaultFirstLineIndent > 0
               ? `${settings.defaultFirstLineIndent}${settings.defaultFirstLineIndentUnit}`
               : "0",
            } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}