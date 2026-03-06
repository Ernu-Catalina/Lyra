import { Plus } from "lucide-react";

interface SidebarHeaderProps {
  documentTitle: string;
  onAddChapter: () => void;
}

export function SidebarHeader({ documentTitle, onAddChapter }: SidebarHeaderProps) {
  return (
    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{documentTitle}</h2>
      <button
        onClick={onAddChapter}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg transition"
      >
        <Plus size={16} />
        <span>Add Chapter</span>
      </button>
    </div>
  );
}