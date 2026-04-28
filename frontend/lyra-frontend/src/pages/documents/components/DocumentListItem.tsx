// src/components/documents/DocumentListItem.tsx
import { FileText } from "lucide-react";
import type { MouseEvent } from "react";

interface DocumentListItemProps {
  document: any;
  onNavigate: () => void;
  onContextMenu?: (e: MouseEvent, item: any) => void;
}

export default function DocumentListItem({
  document,
  onNavigate,
  onContextMenu,
}: DocumentListItemProps) {
  const safeNavigate = () => {
    if (typeof onNavigate !== 'function') {
      console.error("onNavigate is not a function!", onNavigate);
      return;
    }
    try {
      onNavigate();
    } catch (err) {
      console.error("Error inside onNavigate handler:", err);
    }
  };

  if (!document) {
    return <div className="text-[var(--accent)] p-4">Missing document data</div>;
  }

  return (
    <div
      onClick={safeNavigate}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, {
          _id: document._id,
          title: document.title,
          type: document.type,
        });
      }}
      className="
        grid grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-6 px-6 py-4 
        hover:bg-[var(--accent)]/5 transition cursor-pointer 
        group items-center border-b border-[var(--border)]/30 last:border-b-0
      "
    >
      {/* Title + icon – takes most space (3fr) */}
      <div className="flex items-center gap-4">
        <FileText size={20} className="text-[var(--accent)] flex-shrink-0" />
        <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] line-clamp-1 flex-1">
          {document.title}
        </span>
      </div>

      {/* Created Date - NEW COLUMN */}
      <div className="text-right text-[var(--text-secondary)] text-sm">
        {new Date(document.created_at).toLocaleDateString()}
      </div>

      {/* Last Modified */}
      <div className="text-right text-[var(--text-secondary)] text-sm">
        {new Date(document.updated_at).toLocaleDateString()}
      </div>

      {/* Chapters */}
      <div className="text-right text-[var(--text-secondary)] text-sm">
        {document.chapter_count ?? "—"}
      </div>

      {/* Words */}
      <div className="text-right text-[var(--text-secondary)] text-sm">
        {document.word_count ?? "—"}
      </div>
    </div>
  );
}