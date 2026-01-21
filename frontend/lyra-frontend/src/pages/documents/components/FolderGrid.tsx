import { Folder, Edit, Trash2 } from "lucide-react";

interface FolderGridProps {
  folders: any[];
  onEnterFolder: (folderId: string) => void;
  onEdit: (folder: any) => void;
  onDelete: (folderId: string) => void;
  sidebarOpen: boolean;
}

export default function FolderGrid({
  folders,
  onEnterFolder,
  onEdit,
  onDelete,
  sidebarOpen,
}: FolderGridProps) {
  if (folders.length === 0) return null;

  return (
    <div className="mb-6">
      <div className={`
        grid gap-4
        ${sidebarOpen ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"}
      `}>
        {folders.map((folder) => (
          <div
            key={folder._id}
            onClick={() => onEnterFolder(folder._id)}
            className="group flex flex-col items-center p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/50 hover:shadow-md transition cursor-pointer aspect-[4/5] max-w-[180px] mx-auto"
          >
            <Folder size={60} className="text-[var(--accent)] mb-1" />
            <span className="font-medium text-center text-sm line-clamp-2 group-hover:text-[var(--accent)] mb-3">
              {folder.title}
            </span>

            <div className="flex gap-3">
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
        ))}
      </div>
    </div>
  );
}