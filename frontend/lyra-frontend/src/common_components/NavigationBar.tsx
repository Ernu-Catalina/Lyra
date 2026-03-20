// src/common_components/NavigationBar.tsx
import { Search, Download } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";
import { BookOpen } from "lucide-react";

interface NavigationBarProps {
  title: string;
  searchQuery?: string;              // optional – only needed outside editor
  onSearchChange?: (value: string) => void; // optional
  onLogout: () => void;
  onSettings: () => void;
  isEditorView?: boolean;            // NEW: controls search vs export
  onExport?: () => void;             // NEW: callback for export (optional)
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  saveMessage?: string | null;
}

export default function NavigationBar({
  title,
  searchQuery = "",
  onSearchChange,
  onLogout,
  onSettings,
  isEditorView = false,
  onExport,
  saveStatus = 'idle',
  saveMessage = null,
}: NavigationBarProps) {
  return (
    <nav className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Left: Logo + Title (unchanged) */}
      <div className="flex items-center gap-2.5">
        <BookOpen className="h-6 w-6 text-[var(--accent)]" />
        <span className="text-xl font-semibold text-[var(--text-primary)]">{title}</span>
      </div>

      {/* Center/Right: Conditional Search OR Export + Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {isEditorView ? (
          <>
          {/* Persistent Save Status – no background, theme colors */}
            <div className="flex items-center gap-2 text-sm font-medium">
              {saveStatus === 'saving' && (
                <span className="text-[var(--text-secondary)]">Saving…</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[var(--text-secondary)]">Saved</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-[var(--text-secondary)]">Saving failed</span>
              )}
              {saveStatus === 'idle' && (
                <span className="text-[var(--text-secondary)]">Idle</span>
              )}
            </div>
            {/* Export button */}
            <button
              onClick={onExport}
              className="flex items-center gap-3 px-4 py-1.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 rounded-lg text-sm font-medium text-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] min-w-[100px] sm:min-w-[100px]"
              title="Export document"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </>
        ) : (
          /* Original search field (only shown outside editor) */
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="
                pl-10 pr-4 py-1.5 
                bg-[var(--bg-secondary)] border border-[var(--border)] 
                rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] 
                w-56 lg:w-72 transition 
                text-[var(--text-primary)] placeholder-[var(--text-secondary)]
              "
            />
          </div>
        )}

        {/* Profile dropdown – always on the right */}
        <ProfileDropdown onSettings={onSettings} onLogout={onLogout} />
      </div>
    </nav>
  );
}