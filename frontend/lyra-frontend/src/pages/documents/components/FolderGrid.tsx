import { Folder, Edit, Trash2 } from "lucide-react";

interface FolderGridProps {
  folders: any[];
  onEnterFolder: (folderId: string) => void;
  onEdit: (folder: any) => void;
  onDelete: (folderId: string) => void;
}

export default function FolderGrid({
  folders,
  onEnterFolder,
  onEdit,
  onDelete,
}: FolderGridProps) {
  if (folders.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-5 text-[var(--text-primary)]">Folders</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {folders.map((folder) => (
          <div
            key={folder._id}
            onClick={() => onEnterFolder(folder._id)}
            className="group relative flex flex-col items-center p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/50 hover:shadow-md transition cursor-pointer"
          >
            <Folder size={64} className="text-yellow-500 mb-4" />
            <span className="font-medium text-center text-base line-clamp-2 group-hover:text-[var(--accent)] mb-4">
              {folder.title}
            </span>

            {/* Edit & Delete – always visible */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(folder);
                }}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition"
                aria-label="Edit folder"
                title="Edit folder"
              >
                <Edit size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(folder._id);
                }}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                aria-label="Delete folder"
                title="Delete folder"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}