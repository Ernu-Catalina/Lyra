import type { ReactNode } from "react";
import { ForwardedRef, forwardRef } from "react";

interface EditorLayoutProps {
  sidebar: ReactNode;
  toolbar?: ReactNode;
  editor: ReactNode;
  footer?: ReactNode;
  isFullscreen?: boolean;
}

export const EditorLayout = forwardRef(
  ({ sidebar, toolbar, editor, footer, isFullscreen = false }: EditorLayoutProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
      <div ref={ref} className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
        {/* Sidebar – fixed width, hidden in fullscreen */}
        {!isFullscreen && (
          <aside className="w-75 border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto">
            {sidebar}
          </aside>
        )}

        {/* Main area */}
        <div className={`${isFullscreen ? "w-full" : "flex-1"} flex flex-col overflow-hidden`}>
          {/* Toolbar – sticky, hidden in fullscreen */}
          {!isFullscreen && toolbar && (
            <div className="sticky top-0 z-20 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-1 flex items-center gap-2">
              {toolbar}
            </div>
          )}

          {/* Editor content – scrollable */}
          <main id="editor-scroll-area" className="flex-1 overflow-y-auto bg-[#C8C8C8]">
            {editor}
          </main>

          {/* Footer – word count and zoom controls, always visible */}
          {footer && footer}
        </div>
      </div>
    );
  }
);