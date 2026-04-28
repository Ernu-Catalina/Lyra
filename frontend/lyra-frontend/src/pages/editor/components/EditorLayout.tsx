// src/pages/editor/components/EditorLayout.tsx
import type { ReactNode } from "react";
import { ForwardedRef, forwardRef } from "react";
import { ChevronRight } from "lucide-react";

interface EditorLayoutProps {
  sidebar: ReactNode;
  toolbar?: ReactNode;
  editor: ReactNode;
  footer?: ReactNode;
  isFullscreen?: boolean;
  sidebarWidth?: number;
  onSidebarResize?: (width: number) => void;
  isSidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export const EditorLayout = forwardRef(
  ({ 
    sidebar, 
    toolbar, 
    editor, 
    footer, 
    isFullscreen = false,
    sidebarWidth = 300,
    onSidebarResize,
    isSidebarOpen = true,
    onSidebarToggle 
  }: EditorLayoutProps, ref: ForwardedRef<HTMLDivElement>) => {
    
    return (
      <div ref={ref} className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
        
        {/* Sidebar Area */}
        {!isFullscreen && (
          <div className="flex-shrink-0 relative border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
            
            {/* Expanded Sidebar */}
            {isSidebarOpen && (
              <div 
                className="h-full relative"
                style={{ width: `${sidebarWidth}px` }}
              >
                {sidebar}
                
                {/* Resize Handle */}
                <div
                  className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-[var(--accent)] cursor-col-resize z-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const startWidth = sidebarWidth;

                    const onMouseMove = (moveEvent: MouseEvent) => {
                      const newWidth = Math.max(180, Math.min(480, startWidth + (moveEvent.clientX - startX)));
                      onSidebarResize?.(newWidth);
                    };

                    const onMouseUp = () => {
                      document.removeEventListener("mousemove", onMouseMove);
                      document.removeEventListener("mouseup", onMouseUp);
                    };

                    document.addEventListener("mousemove", onMouseMove);
                    document.addEventListener("mouseup", onMouseUp);
                  }}
                />
              </div>
            )}

            {/* Collapsed Bar - Visible when closed */}
            {!isSidebarOpen && (
              <div 
                className="w-14 h-full flex items-center justify-center border-r border-[var(--border)] bg-[var(--bg-secondary)] cursor-pointer hover:bg-[var(--bg-primary)] transition-colors"
                onClick={onSidebarToggle}
                title="Expand sidebar"
              >
                <ChevronRight size={24} className="text-[var(--text-secondary)]" />
              </div>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className={`${isFullscreen ? "w-full" : "flex-1"} flex flex-col overflow-hidden`}>
          {!isFullscreen && toolbar && (
            <div className="sticky top-0 z-20 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-1 flex items-center gap-2">
              {toolbar}
            </div>
          )}

          <main id="editor-scroll-area" className="flex-1 overflow-y-auto bg-[#C8C8C8]">
            {editor}
          </main>

          {footer && footer}
        </div>
      </div>
    );
  }
);