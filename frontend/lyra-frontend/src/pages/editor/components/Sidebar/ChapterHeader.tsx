import { ChevronDown, ChevronRight, Plus } from "lucide-react";

interface ChapterHeaderProps {
  title: string;
  isOpen: boolean;
  isActive?: boolean;                // NEW: to apply bold when chapter is selected
  onToggle: () => void;
  onChapterClick: () => void;        // NEW: switch to chapter view
  onAddScene: () => void;
}

export function ChapterHeader({
  title,
  isOpen,
  isActive = false,
  onToggle,
  onChapterClick,
  onAddScene,
}: ChapterHeaderProps) {
  return (
    <div className="flex items-center justify-between py-1 px-3 hover:bg-[var(--bg-secondary)]/50 rounded-md">
      {/* Chevron – only toggles open/close */}
      <div
        className="flex items-center gap-1.5 cursor-pointer flex-1"
        onClick={onToggle}
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {/* Title text – switches to chapter view when clicked */}
        <span
          className={`font-medium text-[var(--text-primary)] cursor-pointer ${isActive ? "font-bold" : ""}`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering onToggle
            onChapterClick();
          }}
        >
          {title}
        </span>
      </div>

      {/* Add scene button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddScene();
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--accent)]/10 rounded"
        title="Add scene"
      >
        <Plus size={16} className="text-[var(--accent)]" />
      </button>
    </div>
  );
}