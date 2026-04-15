import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useDocumentSettings, type DocumentSettings, applyPageStyles } from "../../context/DocumentSettingsContext";

interface SceneEditorPageViewProps {
  children: ReactNode;
}

const PAPER_SIZES: Record<DocumentSettings["paperFormat"], { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  A5: { width: 148, height: 210 },
  Legal: { width: 215.9, height: 355.6 },
  Custom: { width: 210, height: 297 },
};

export function SceneEditorPageView({ children }: SceneEditorPageViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const { settings } = useDocumentSettings();

  const pageSize = settings.paperFormat === "Custom" ? { width: settings.customWidth, height: settings.customHeight } : PAPER_SIZES[settings.paperFormat];

  // Apply margin and print size settings when they change
  useEffect(() => {
    if (!pageContainerRef.current) return;

    const convertToMm = (value: number, unit: "mm" | "cm" | "in"): number => {
      switch (unit) {
        case "cm": return value * 10;
        case "in": return value * 25.4;
        default: return value;
      }
    };

    const marginTopMm = convertToMm(settings.marginTop, settings.marginUnit);
    const marginBottomMm = convertToMm(settings.marginBottom, settings.marginUnit);
    const marginLeftMm = convertToMm(settings.marginLeft, settings.marginUnit);
    const marginRightMm = convertToMm(settings.marginRight, settings.marginUnit);

    const element = pageContainerRef.current;
    element.style.paddingTop = `${marginTopMm}mm`;
    element.style.paddingBottom = `${marginBottomMm}mm`;
    element.style.paddingLeft = `${marginLeftMm}mm`;
    element.style.paddingRight = `${marginRightMm}mm`;
    element.style.setProperty("--print-width", `${pageSize.width}mm`);
    element.style.setProperty("--print-height", `${pageSize.height}mm`);
  }, [settings.marginTop, settings.marginBottom, settings.marginLeft, settings.marginRight, settings.marginUnit, pageSize.width, pageSize.height]);

  // BUG FIX 1: Re-apply page styles whenever settings change to persist after re-renders
  useEffect(() => {
    applyPageStyles(settings);
  }, [settings]);

  return (
    <div 
      className="editor-scroll-area"
    >
      <div 
        ref={containerRef}
        className="w-full max-w-[1200px] text-[var(--text-primary)]"
      >
        {/* Main A4 Page Container */}
        <div 
          ref={pageContainerRef}
          className="bg-white rounded-sm shadow-2xl page-container"
          style={{
            width: `${pageSize.width}mm`,
            minHeight: `${pageSize.height}mm`,
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          <div className="w-full h-full text-[var(--text-primary)] break-words">
            {children}
          </div>
        </div>
      </div>

      <style>{`
        /* Print Styles - Critical for proper pagination */
        @media print {
          .page-container {
            page-break-after: always;
            break-inside: avoid;
            margin: 0;
            width: var(--print-width);
            height: var(--print-height);
            border: none;
            box-shadow: none;
            border-radius: 0;
          }

          .ProseMirror {
            orphans: 3;
            widows: 3;
          }

          .ProseMirror h1,
          .ProseMirror h2,
          .ProseMirror h3,
          .ProseMirror h4 {
            page-break-after: avoid;
          }

          .ProseMirror img {
            max-width: 100%;
            height: auto;
            page-break-inside: avoid;
          }

          .ProseMirror ul,
          .ProseMirror ol {
            page-break-inside: avoid;
          }

          .ProseMirror li {
            page-break-inside: avoid;
          }
        }

        /* Screen Display - Proper pagination visualization */
        .page-container {
          display: flex;
          flex-direction: column;
          overflow: visible;
        }

        .page-container > div {
          flex: 1;
          overflow: visible;
          display: flex;
          flex-direction: column;
        }

        /* Remove any borders from editor content */
        .ProseMirror {
          outline: none;
          border: none;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        /* Prevent breaks inside headings and images */
        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3,
        .ProseMirror h4,
        .ProseMirror img,
        .ProseMirror blockquote {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Handle long words */
        .ProseMirror {
          word-wrap: break-word;
          -webkit-hyphens: auto;
          -moz-hyphens: auto;
          hyphens: auto;
        }

        /* Ensure paragraphs don't break awkwardly */
        .ProseMirror p {
          break-inside: avoid-page;
          page-break-inside: avoid;
        }
      `}</style>
    </div>
  );
}