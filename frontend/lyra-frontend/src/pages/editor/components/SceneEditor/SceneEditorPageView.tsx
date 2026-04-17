import { type ReactNode, useEffect, useRef, useState } from "react";
import { useDocumentSettings, type DocumentSettings } from "../../context/DocumentSettingsContext";

interface SceneEditorPageViewProps {
  children: ReactNode;
  scale?: number;
}

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

  const pageWidthPx = mmToPx(paperSize.width);
  const pageHeightPx = mmToPx(paperSize.height);
  const marginTopPx = mmToPx(marginTopMm);
  const marginBottomPx = mmToPx(marginBottomMm);
  const marginLeftPx = mmToPx(marginLeftMm);
  const marginRightPx = mmToPx(marginRightMm);

  const GAP = 24;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const rawContentHeight = el.scrollHeight;
      // Subtract the gap padding using previousPageCountRef to avoid feedback loop
      const actualContentHeight = rawContentHeight - (previousPageCountRef.current - 1) * GAP;
      const usablePageHeight = pageHeightPx - marginTopPx - marginBottomPx;
      const pages = Math.max(1, Math.ceil(actualContentHeight / usablePageHeight));
      
      // Only update if pages differ from current to prevent oscillation
      if (pages !== pageCount) {
        setPageCount(pages);
        previousPageCountRef.current = pages;
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageHeightPx, marginTopPx, marginBottomPx, pageCount]);

  const totalHeight = pageCount * pageHeightPx + (pageCount - 1) * GAP;

  const scaledWidth = pageWidthPx * scale;
  const scaledTotalHeight = totalHeight * scale;

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
      {/* Outer div reserves the scaled screen space */}
      <div style={{ width: scaledWidth, height: scaledTotalHeight, position: "relative" }}>
        {/* Inner div is rendered at 100% then scaled via CSS transform */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: pageWidthPx,
            height: totalHeight,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          {/* Page backgrounds */}
          {Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * (pageHeightPx + GAP),
                left: 0,
                width: pageWidthPx,
                height: pageHeightPx,
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                borderRadius: 2,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Gap covers — grey bars that sit on top of content in gap regions */}
          {Array.from({ length: pageCount - 1 }).map((_, i) => (
            <div key={`gap-${i}`} style={{
              position: "absolute",
              top: (i + 1) * pageHeightPx + i * GAP,
              left: -40,                          // extend beyond page edges
              width: pageWidthPx + 80,
              height: GAP,
              background: "#C8C8C8",              // same as scroll area background
              zIndex: 2,
              pointerEvents: "none",
            }} />
          ))}

          {/* Editor content — single instance, flows continuously, gaps are masked above it */}
          <div
            ref={contentRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: pageWidthPx,
              zIndex: 1,
              boxSizing: "border-box",
              paddingTop: marginTopPx,
              paddingLeft: marginLeftPx,
              paddingRight: marginRightPx,
              // Bottom padding accounts for all gaps so content shifts down correctly
              paddingBottom: marginBottomPx + (pageCount - 1) * GAP,
              fontFamily: settings.defaultFont,
              fontSize: `${settings.defaultFontSize}px`,
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Zoom controls removed – now in EditorFooter component */}
    </div>
  );
}