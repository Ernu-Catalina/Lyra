// src/components/Sidebar/SidebarHeader.tsx
import { Plus } from "lucide-react";

interface SidebarHeaderProps {
  documentTitle: string;
  onAddChapter: () => void;
  onDocumentClick: () => void;
}

export function SidebarHeader({ documentTitle, onAddChapter }: SidebarHeaderProps) {
  return (
    <div className="px-4 py-2 bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between">
        {/* Document title – left side */}
        <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate max-w-[70%]">
          {documentTitle}
        </h2>

        {/* [+ Chapter] button – right side, inline */}
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