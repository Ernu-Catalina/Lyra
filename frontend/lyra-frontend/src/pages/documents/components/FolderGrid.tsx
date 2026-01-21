import { Folder, Edit, Trash2 } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

interface FolderGridProps {
  folders: any[];
  onEnterFolder: (folderId: string, folderTitle: string) => void;
  onEdit: (folder: any) => void;
  onDelete: (folderId: string) => void;
  sidebarOpen: boolean;
  currentFolderId?: string | null;
}

function FolderItem({
  folder,
  onEnterFolder,
  onEdit,
  onDelete,
  currentFolderId,
}: {
  folder: any;
  onEnterFolder: (folderId: string, folderTitle: string) => void;
  onEdit: (folder: any) => void;
  onDelete: (folderId: string) => void;
  currentFolderId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: folder._id,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onEnterFolder(folder._id, folder.title)}
      className={`
        group flex flex-col items-center justify-between p-4 
        bg-[var(--bg-secondary)] border rounded-xl 
        transition cursor-pointer aspect-[4/5] max-w-[180px] mx-auto
        ${
          isOver
            ? "border-2 border-[var(--accent)] shadow-lg scale-[1.04] ring-1 ring-[var(--accent)]/30"
            : "border-[var(--border)] hover:border-[var(--accent)]/50 hover:shadow-md"
        }
      `}
    >
      <div className="flex flex-col items-center flex-grow justify-center">
        <Folder
          size={60}
          className={`mb-3 ${isOver ? "text-[var(--accent)]" : "text-[var(--accent)]/80"}`}
        />

        <span
          className={`
            font-medium text-center text-sm line-clamp-2 px-1
            ${isOver ? "text-[var(--accent)] font-semibold" : "group-hover:text-[var(--accent)]"}
          `}
        >
          {folder.title}
        </span>
      </div>

      <div className="flex gap-3 opacity-60 group-hover:opacity-100 transition-opacity mt-3">
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
}

export default function FolderGrid({
  folders,
  onEnterFolder,
  onEdit,
  onDelete,
  sidebarOpen,
  currentFolderId,
}: FolderGridProps) {
  if (folders.length === 0) return null;

  return (
    <div className="mb-8">
      <div
        className={`
          grid gap-4
          ${sidebarOpen ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"}
        `}
      >
        {folders.map((folder) => (
          <FolderItem
            key={folder._id}
            folder={folder}
            onEnterFolder={onEnterFolder}
            onEdit={onEdit}
            onDelete={onDelete}
            currentFolderId={currentFolderId}
          />
        ))}
      </div>
    </div>
  );
}