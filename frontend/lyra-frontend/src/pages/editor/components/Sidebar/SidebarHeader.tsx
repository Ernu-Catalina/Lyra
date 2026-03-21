import { Plus } from "lucide-react";

interface SidebarHeaderProps {
  documentTitle: string;
  onAddChapter: () => void;
  onDocumentClick: () => void;           // ← must be present
}

export function SidebarHeader({ documentTitle, onAddChapter, onDocumentClick }: SidebarHeaderProps) {
  return (
    <div className="px-4 py-1.4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between">
        {/* Document title – clickable to switch to document view */}
        <h2 
          className="text-lg font-semibold text-[var(--text-primary)] cursor-pointer hover:text-[var(--accent)] transition truncate max-w-[70%]"
          onClick={onDocumentClick}                // ← ADD THIS
        >
          {documentTitle}
        </h2>

        {/* [+ Chapter] button */}
        <button
          onClick={onAddChapter}
          className="
            flex items-center gap-1 px-2.5 py-1.5 
            text-sm font-medium text-[var(--accent)] 
            hover:bg-[var(--accent)]/10 rounded-md transition-colors
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30
          "
          title="Add new chapter"
        >
          <Plus size={16} />
          <span>Chapter</span>
        </button>
      </div>
    </div>
  );
}