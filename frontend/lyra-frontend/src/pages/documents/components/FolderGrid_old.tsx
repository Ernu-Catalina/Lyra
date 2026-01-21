import { Folder, Edit, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface FolderGridProps {
  folders: any[];
  onEnterFolder: (folderId: string, folderTitle: string) => void; 
  onEdit: (folder: any) => void;
  onDelete: (folderId: string) => void;
  sidebarOpen: boolean;
  currentFolderId?: string | null; 
}

export default function FolderGrid({
  folders,
  onEnterFolder,
  onEdit,
  onDelete,
  sidebarOpen,
}: FolderGridProps) {
  if (folders.length === 0) return null;

{folders.map((folder) => {
  // ── Draggable logic ────────────────────────────────────────
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: folder._id,
    // Optional: disable dragging the current folder or root if needed
    disabled: folder._id === currentFolderId,
  });

  // ── Droppable logic ────────────────────────────────────────
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: folder._id,
  });

  // Combine refs (common pattern)
  const setRefs = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    scale: isDragging ? 1.04 : 1,
  };

  return (
    <div
      key={folder._id}
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEnterFolder(folder._id, folder.title)}
      className={`
        group flex flex-col items-center p-4 
        bg-[var(--bg-secondary)] border rounded-xl 
        transition cursor-pointer aspect-[4/5] max-w-[180px] mx-auto
        ${isOver 
          ? "border-[var(--accent)] border-2 shadow-lg scale-[1.03]" 
          : "border-[var(--border)] hover:border-[var(--accent)]/50 hover:shadow-md"}
        ${isDragging ? "shadow-2xl ring-2 ring-[var(--accent)]/40" : ""}
      `}
    >
      <Folder 
        size={60} 
        className={`mb-1 ${isOver ? "text-[var(--accent)]" : "text-[var(--accent)]/80"}`} 
      />
      
      <span 
        className={`
          font-medium text-center text-sm line-clamp-2 
          group-hover:text-[var(--accent)] mb-3
          ${isOver ? "text-[var(--accent)]" : ""}
        `}
      >
        {folder.title}
      </span>

      <div className="flex gap-3 opacity-70 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(folder);
          }}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition"
          aria-label="Edit folder"
          title="Edit folder"
        >
          <Edit size={18} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(folder._id);
          }}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition"
          aria-label="Delete folder"
          title="Delete folder"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
})}}