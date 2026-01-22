// src/components/documents/DocumentListItem.tsx
import { FileText, Edit, Trash2 } from "lucide-react";

interface DocumentListItemProps {
  document: any;
  onNavigate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function DocumentListItem({
  document,
  onNavigate,
  onEdit,
  onDelete,
}: DocumentListItemProps) {
  const safeNavigate = () => {
    console.log("navigate clicked → document ID:", document?._id);
    console.log("onNavigate type:", typeof onNavigate);

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
    console.error("DocumentListItem received no document prop");
    return <div className="text-red-600 p-4">Missing document data</div>;
  }

  return (
    <div
      onClick={safeNavigate}       
      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[var(--accent)]/5 transition cursor-pointer group items-center"
    >
      {/* Title + icon */}
      <div className="col-span-4 flex items-center gap-3">
        <FileText size={20} className="text-[var(--accent)]" />
        <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] line-clamp-1 flex-1">
          {document.title}
        </span>
      </div>

      {/* Last Modified */}
      <div className="col-span-3 text-[var(--text-secondary)] text-sm">
        {new Date(document.updated_at).toLocaleDateString()}
      </div>

      {/* Chapters */}
      <div className="col-span-2 text-center text-[var(--text-secondary)]">
        {document.chapter_count ?? "—"}
      </div>

      {/* Words */}
      <div className="col-span-2 text-center text-[var(--text-secondary)]">
        {document.word_count ?? "—"}
      </div>

      {/* Edit & Delete Buttons */}
      <div className="col-span-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition"
          aria-label="Edit document"
          title="Edit document"
        >
          <Edit size={16} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-[var(--accent)] hover:text-[var(--accent)] hover:bg-red-50 rounded transition"
          aria-label="Delete document"
          title="Delete document"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}