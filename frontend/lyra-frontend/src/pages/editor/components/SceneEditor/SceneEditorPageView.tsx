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
  const previousPageCountRef = useRef(1);
  const [pageCount, setPageCount] = useState(1);

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

  // Must be declared after marginTopPx is defined
  const GAP_PX = Math.min(40, Math.max(16, Math.round(marginTopPx * 0.15)));

  const usableHeightPx = pageHeightPx - marginTopPx - marginBottomPx;
  // spacer = the dead zone between two pages' usable areas
  // = bottomMargin + grey gap + topMargin
  const spacerHeightPx = marginBottomPx + GAP_PX + marginTopPx;
  // stride = distance from start of one page's usable area to next
  const stride = usableHeightPx + spacerHeightPx;

  // Total visual canvas height (all pages + all gaps, with outer margins)
  // = marginTop + N*usable + (N-1)*spacer + marginBottom
  // = marginTop + N*usable + (N-1)*(marginBottom+GAP+marginTop) + marginBottom
  const totalHeightPx =
    marginTopPx +
    pageCount * usableHeightPx +
    (pageCount - 1) * spacerHeightPx +
    marginBottomPx;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      // content div has no fixed height — scrollHeight = natural content height
      // including spacer nodes inserted by usePaginator.
      // Each spacer = spacerHeightPx. Content grows by usableHeightPx per page.
      // Total scrollHeight ≈ marginTop + N*usable + (N-1)*spacer + marginBottom
      // So N ≈ (scrollHeight - marginTop - marginBottom + spacer) / (usable + spacer)
      const sh = el.scrollHeight;
      const pages = Math.max(
        1,
        Math.round(
          (sh - marginTopPx - marginBottomPx + spacerHeightPx) /
          (usableHeightPx + spacerHeightPx)
        )
      );
      if (pages !== previousPageCountRef.current) {
        setPageCount(pages);
        previousPageCountRef.current = pages;
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [usableHeightPx, spacerHeightPx, marginTopPx, marginBottomPx]);

  const correctedFontSize = settings.defaultFontSize * VISUAL_CORRECTION;

  return (
    // Outer scroll area — grey background fills the space between pages
    <div style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px",
      boxSizing: "border-box",
      backgroundColor: "var(--bg-primary)",
    }}>
      {/* Reserves the correct scaled space in the layout */}
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

          {/* White page sheet backgrounds.
              Page i top = i * stride
              where stride = usable + spacer
              This places each sheet so:
                - its top = start of page i's top margin zone
                - its content area starts at top + marginTopPx
                - its bottom margin ends at top + pageHeightPx
                - the GAP_PX grey strip follows immediately after */}
          {Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={`page-${i}`}
              style={{
                position: "absolute",
                top: i * stride,
                left: 0,
                width: pageWidthPx,
                height: pageHeightPx,
                background: "var(--bg-secondary)", 
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                borderRadius: 2,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          ))}

          {/* Grey gap strips between pages.
              Gap i sits between page i and page i+1.
              Gap top = page i bottom = i*stride + pageHeightPx
              Gap height = GAP_PX
              Gap bottom = i*stride + pageHeightPx + GAP_PX
                         = i*stride + marginTop + usable + marginBottom + GAP
                         = i*stride + spacer - marginTop + usable + marginTop
                         ... simplifies to (i+1)*stride  ✓ (= top of page i+1) */}
          {Array.from({ length: pageCount - 1 }).map((_, i) => (
            <div
              key={`gap-${i}`}
              style={{
                position: "absolute",
                top: i * stride + pageHeightPx,
                left: -40,
                width: pageWidthPx + 80,
                height: GAP_PX,
                background: "var(--bg-primary)",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Editor content div — NO fixed height so ProseMirror can grow.
              Spacer nodes inserted by usePaginator push content past each
              page boundary (bottomMargin + GAP + topMargin per boundary).
              The content div's paddingTop shifts content down by marginTopPx,
              which aligns with page sheet i starting at i*stride:
                sheet top    = i*stride
                content top  = i*stride + marginTopPx  ✓ */}
          <div
            ref={contentRef}
            className="page-container"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: pageWidthPx,
              // NO height — let content grow naturally so ResizeObserver works
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