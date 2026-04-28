// src/pages/editor/components/Sidebar/SidebarHeader.tsx
import { Plus, ChevronLeft } from "lucide-react";

interface SidebarHeaderProps {
  documentTitle: string;
  onAddChapter: () => void;
  onDocumentClick: () => void;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export function SidebarHeader({ 
  documentTitle, 
  onAddChapter, 
  onDocumentClick,
  isSidebarOpen,
  onSidebarToggle 
}: SidebarHeaderProps) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      {/* Document Title */}
      <div 
        className="flex-1 cursor-pointer hover:text-[var(--accent)] transition"
        onClick={onDocumentClick}
      >
        <h2 className="text-lg font-semibold truncate">
          {documentTitle}
        </h2>
      </div>

        {/* Add Chapter Button */}
        <button
          onClick={onAddChapter}
          className="
            flex items-center gap-1 px-3 py-1.5
            text-sm font-medium text-[var(--accent)] 
            hover:bg-[var(--accent)]/10 rounded-md transition-colors
          "
          title="Add new chapter"
        >
          <Plus size={16} />
          <span>Chapter</span>
        </button>

        {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onSidebarToggle}
          className="p-1.5 hover:bg-[var(--bg-primary)] rounded-md transition-colors"
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronLeft 
            size={20} 
            className={`transition-transform ${isSidebarOpen ? "" : "rotate-180"}`} 
          />
        </button>
      </div>
    </div>
  );
}