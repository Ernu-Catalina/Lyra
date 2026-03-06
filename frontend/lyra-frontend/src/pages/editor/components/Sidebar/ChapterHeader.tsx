import { ChevronDown, ChevronRight, Plus } from "lucide-react";

interface ChapterHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onAddScene: () => void;
}

export function ChapterHeader({ title, isOpen, onToggle, onAddScene }: ChapterHeaderProps) {
  return (
    <div
      className="flex items-center justify-between py-1 px-3 hover:bg-[var(--bg-secondary)]/50 rounded-md cursor-pointer group"
      onClick={onToggle}
    >
      <div className="flex items-center gap-1.5">
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-medium text-[var(--text-primary)]">{title}</span>
      </div>

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