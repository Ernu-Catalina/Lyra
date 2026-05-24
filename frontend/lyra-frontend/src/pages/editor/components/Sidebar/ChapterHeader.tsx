import { ChevronDown, ChevronRight, Plus } from "lucide-react";

interface ChapterHeaderProps {
  title: string;
  isOpen: boolean;
  isActive?: boolean;
  isSpecial?: boolean;
  hideToggle?: boolean;
  showAddScene?: boolean;
  onToggle: () => void;
  onChapterClick: () => void;
  onAddScene: () => void;
}

export function ChapterHeader({
  title,
  isOpen,
  isActive = false,
  isSpecial = false,
  hideToggle = false,
  showAddScene = true,
  onToggle,
  onChapterClick,
  onAddScene,
}: ChapterHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 rounded-md hover:bg-[var(--bg-secondary)]/50">
      <div
        className={`flex items-center gap-1.5 flex-1 ${hideToggle ? "" : "cursor-pointer"}`}
        onClick={hideToggle ? undefined : onToggle}
      >
        {!hideToggle && (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        <span
          className={`cursor-pointer ${
            isSpecial
              ? `font-normal text-[var(--text-secondary)] ${isActive ? "text-[var(--text-primary)]" : ""}`
              : `text-[var(--text-primary)] ${isActive ? "font-bold" : "font-medium"}`
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onChapterClick();
          }}
        >
          {title}
        </span>
      </div>

      {showAddScene && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddScene();
          }}
          className="opacity-0 hover:opacity-100 transition-opacity p-1 hover:bg-[var(--accent)]/10 rounded"
          title="Add scene"
        >
          <Plus size={16} className="text-[var(--accent)]" />
        </button>
      )}
    </div>
  );
}