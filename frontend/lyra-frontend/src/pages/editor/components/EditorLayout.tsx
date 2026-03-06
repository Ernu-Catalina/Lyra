import type { ReactNode } from "react";

interface EditorLayoutProps {
  sidebar: ReactNode;
  toolbar?: ReactNode;
  editor: ReactNode;
  footer?: ReactNode;
}

export function EditorLayout({ sidebar, toolbar, editor, footer }: EditorLayoutProps) {
  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Sidebar – fixed width */}
      <aside className="w-75 border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto">
        {sidebar}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar – sticky */}
        {toolbar && (
          <div className="sticky top-0 z-20 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-1 flex items-center gap-2">
            {toolbar}
          </div>
        )}

        {/* Editor content – scrollable */}
        <main className="flex-1 overflow-y-auto p-1">{editor}</main>

        {/* Footer – word count etc. */}
        {footer && (
          <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
            <div className="max-w-4xl mx-auto px-6 py-3 text-center">
              {footer}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}