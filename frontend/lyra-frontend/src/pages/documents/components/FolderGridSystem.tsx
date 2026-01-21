// src/components/documents/FolderGridSystem.tsx
import { Folder } from "lucide-react";
import { Edit, Trash2 } from "lucide-react";

interface FolderGridSystemProps {
  folders: any[];
  onEnterFolder: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

export default function FolderGridSystem({
  folders,
  onEnterFolder,
  onEdit,
  onDelete,
}: FolderGridSystemProps) {
  if (folders.length === 0) return null;

  return (
    <div className="mb-2">   {/* ← reduced from mb-12 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">  {/* ← more columns, smaller gap */}
        {folders.map((folder) => (
          <div
            key={folder._id}
            onClick={() => onEnterFolder(folder._id)}
            className="group flex flex-col items-center p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/50 hover:shadow-md transition cursor-pointer aspect-[4/5]"
          >
            <Folder size={64} className="text-yellow-500 mb-3" />
            <span className="font-medium text-center text-lg line-clamp-2 group-hover:text-[var(--accent)] mb-4">
              {folder.title}
            </span>

            {/* Edit & Delete – always visible, under name */}
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