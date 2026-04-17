import React, { ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { WordCountDisplay } from "./WordCountDisplay";

interface EditorFooterProps {
  wordCountText: string | null;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  editorMode?: "scene" | "chapter" | "document";
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

/**
 * EditorFooter: A flexible footer container that positions:
 * - zoom controls sticky-left
 * - word count display in the center
 * - fullscreen toggle sticky-right
 * Always visible, even in fullscreen mode to provide exit control.
 */
export function EditorFooter({
  wordCountText,
  scale,
  onScaleChange,
  editorMode,
  isFullscreen = false,
  onFullscreenToggle,
}: EditorFooterProps) {
  // Only show zoom controls in scene mode
  const showZoom = editorMode === "scene" && typeof scale === "number" && onScaleChange;

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
      <div className="flex items-center justify-between px-4 py-2 relative">
        {/* Left section: Zoom controls (sticky-left) */}
        <div className="flex items-center gap-2">
          {showZoom && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border)]">
              <button
                onClick={() => onScaleChange!(Math.max(0.25, Math.round((scale - 0.1) * 10) / 10))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text-primary)",
                  padding: "0 2px",
                  lineHeight: 1,
                }}
                title="Zoom out"
              >
                −
              </button>
              <span style={{ minWidth: 40, textAlign: "center", fontSize: 12 }}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => onScaleChange!(Math.min(2, Math.round((scale + 0.1) * 10) / 10))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text-primary)",
                  padding: "0 2px",
                  lineHeight: 1,
                }}
                title="Zoom in"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Center section: Word count display */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <WordCountDisplay text={wordCountText} />
        </div>

        {/* Right section: Fullscreen toggle (sticky-right) */}
        <div className="flex items-center gap-2 ml-auto">
          {onFullscreenToggle && (
            <button
              onClick={onFullscreenToggle}
              className="p-1.5 rounded text-sm bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border)] flex items-center justify-center"
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen (F)"}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 size={16} color="var(--text-primary)" />
              ) : (
                <Maximize2 size={16} color="var(--text-primary)" />
              )}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
