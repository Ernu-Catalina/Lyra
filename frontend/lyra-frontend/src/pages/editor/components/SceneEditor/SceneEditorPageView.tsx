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
function mmToPx(mm: number) { return mm * MM_TO_PX; }
function convertToMm(value: number, unit: "mm" | "cm" | "in") {
  if (unit === "cm") return value * 10;
  if (unit === "in") return value * 25.4;
  return value;
}

export function SceneEditorPageView({ children, scale = 1 }: SceneEditorPageViewProps) {
  const { settings } = useDocumentSettings();
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [spacerTops, setSpacerTops] = useState<number[]>([]);

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

  const GAP_PX         = Math.round(Math.min(marginTopPx, marginBottomPx) / 4);
  const usableHeightPx = pageHeightPx - marginTopPx - marginBottomPx;
  const spacerHeightPx = marginBottomPx + GAP_PX + marginTopPx;

  // Measure actual spacer positions from the DOM.
  // This is the ground truth for positioning page backgrounds and gap covers —
  // we use where spacers actually rendered, not where geometry says they should be.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const measureSpacers = () => {
      const containerRect = container.getBoundingClientRect();
      const spacerEls = container.querySelectorAll('[data-type="page-break-spacer"]');

      const tops = Array.from(spacerEls).map((spacer) => {
        const rect = spacer.getBoundingClientRect();
        // Position relative to container top, corrected for CSS scale transform
        return (rect.top - containerRect.top) / scale;
      });

      setSpacerTops(tops);
      setPageCount(spacerEls.length + 1);
    };

    // Re-measure when spacers are inserted/removed by usePaginator
    const mutationObserver = new MutationObserver(measureSpacers);
    mutationObserver.observe(container, { childList: true, subtree: true });

    // Re-measure when content height changes
    const resizeObserver = new ResizeObserver(measureSpacers);
    resizeObserver.observe(container);

    measureSpacers();

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [scale]);

  // Total canvas height.
  // When spacers have been measured, derive from last spacer position.
  // Before first measurement, fall back to geometric estimate.
  const totalHeightPx = spacerTops.length > 0
    ? (spacerTops[spacerTops.length - 1] ?? 0) +
      spacerHeightPx +
      usableHeightPx +
      marginBottomPx
    : marginTopPx +
      pageCount * usableHeightPx +
      (pageCount - 1) * spacerHeightPx +
      marginBottomPx;

  const correctedFontSize = settings.defaultFontSize * VISUAL_CORRECTION;

  return (
    <div style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px",
      boxSizing: "border-box",
      backgroundColor: "var(--bg-primary)",
    }}>
      {/* Reserves correct scaled space in layout flow */}
      <div style={{
        width: pageWidthPx * scale,
        height: totalHeightPx * scale,
        position: "relative",
        flexShrink: 0,
      }}>
        {/* Full-size inner div, scaled from top-left */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: pageWidthPx,
          height: totalHeightPx,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
        }}>

          {/* White page backgrounds.
              Each page covers the region from its top to the start of
              the next spacer (or end of content for the last page).
              Using measured spacer positions so backgrounds always align
              with actual content breaks, not theoretical geometry. */}
          {Array.from({ length: pageCount }).map((_, i) => {
           const pageTop = i === 0
            ? 0
            : (spacerTops[i - 1] ?? 0) + spacerHeightPx - marginTopPx;
                    
          const pageBottom = i < spacerTops.length
            ? (spacerTops[i] ?? 0) + marginBottomPx
            : totalHeightPx;
                    
          const pageHeight = Math.max(
            pageBottom - pageTop,
            marginTopPx + marginBottomPx
          );
            return (
              <div
                key={`page-${i}`}
                style={{
                  position: "absolute",
                  top: pageTop,
                  left: 0,
                  width: pageWidthPx,
                  height: pageHeight,
                  background: "var(--bg-secondary)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                  borderRadius: 2,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
            );
          })}

          {/* Grey gap strips between pages.
              The spacer node contains three zones: [marginBottom | GAP | marginTop].
              The grey strip is the middle zone, starting marginBottomPx into
              the spacer. Positioned using measured spacer tops for exact alignment. */}
          {spacerTops.map((spacerTop, i) => (
            <div
              key={`gap-${i}`}
              style={{
                position: "absolute",
                top: spacerTop + marginBottomPx,
                left: -40,
                width: pageWidthPx + 80,
                height: GAP_PX,
                background: "var(--bg-primary)",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Editor content — single ProseMirror instance, no fixed height.
              paddingTop/Bottom/Left/Right enforce the page margins.
              Spacer nodes inserted by usePaginator create the dead zones
              between pages (bottom margin + gap + top margin).
              minHeight ensures the container is always at least totalHeightPx
              tall so the outer reserved div doesn't collapse. */}
          <div
            ref={contentRef}
            className="page-container"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: pageWidthPx,
              minHeight: totalHeightPx,
              zIndex: 1,
              boxSizing: "border-box",
              paddingTop: marginTopPx,
              paddingLeft: marginLeftPx,
              paddingRight: marginRightPx,
              paddingBottom: marginBottomPx,
              fontFamily: settings.defaultFont,
              fontSize: `${correctedFontSize}pt`,
              textAlign: settings.defaultAlignment as any,
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