import { Folder, Edit, Trash2 } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import type { MouseEvent } from "react";

interface FolderGridProps {
  folders: any[];
  onEnterFolder: (folderId: string, folderTitle: string) => void;
  onEdit: (folder: any) => void;
  onDelete: (folderId: string) => void;
  sidebarOpen: boolean;
  currentFolderId?: string | null;
  onContextMenu?: (e: MouseEvent, item?: any) => void;
}

function FolderItem({
  folder,
  onEnterFolder,
  currentFolderId,
  onContextMenu,
}: {
  folder: any;
  onEnterFolder: (folderId: string, folderTitle: string) => void;
  onEdit: (folder: any) => void;
  onDelete: (folderId: string) => void;
  currentFolderId?: string | null;
  onContextMenu?: (e: React.MouseEvent, item?: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: folder._id,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onEnterFolder(folder._id, folder.title)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu && onContextMenu(e, folder);
      }}
      className={`
        group flex flex-col items-center justify-between p-5 
        bg-[var(--bg-secondary)] border rounded-xl 
        transition cursor-pointer aspect-[5/5] max-w-[180px] mx-auto
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
            font-medium text-center text-sm 
            line-clamp-2                 /* allow max 2 lines */
            break-words                  /* force wrap long words */
            leading-tight                /* tighter line spacing for 2 lines */
            px-1 py-1
            ${isOver ? "text-[var(--accent)] font-semibold" : "group-hover:text-[var(--accent)]"}
          `}
          title={folder.title}           
        >
          {folder.title}
        </span>
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
  onContextMenu,
}: FolderGridProps) {
  if (folders.length === 0) return null;

  return (
    <div className="mb-8">
      <div
        className={`
          grid gap-2
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
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );
}