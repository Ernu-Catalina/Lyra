// src/components/documents/FolderGrid.tsx
import { Folder } from "lucide-react";
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
  onContextMenu,
}: {
  folder: any;
  onEnterFolder: (folderId: string, folderTitle: string) => void;
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
        onContextMenu?.(e, folder);
      }}
      className={`
        group relative flex flex-col items-center justify-between
        p-2 sm:p-5
        bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl
        transition-all duration-200 cursor-pointer
        w-[150px] h-[140px]              /* fixed size - adjust if you prefer larger/smaller */
        overflow-hidden                   /* prevent content overflow */
        shadow-sm hover:shadow-md
        ${
          isOver
            ? "border-2 border-[var(--accent)] shadow-lg scale-[1.04] ring-1 ring-[var(--accent)]/30"
            : "hover:border-[var(--accent)]/60 hover:scale-[1.02]"
        }
      `}
    >
      <div className="flex flex-col items-center justify-center w-full space-y-4">
        <Folder
          size={56}
          className={`transition-colors ${
            isOver ? "text-[var(--accent)]" : "text-[var(--accent)]/70 group-hover:text-[var(--accent)]"
          }`}
        />

        <span
          className={`
            font-medium text-center text-sm leading-tight
            line-clamp-2                      /* max 2 lines */
            break-all                         /* force-break long unbreakable words */
            px-2 w-full
            overflow-hidden text-ellipsis     /* ellipsis when text overflows clamp */
            bg-[var(--bg-secondary)]
            ${isOver ? "text-[var(--accent)] font-medium" : "group-hover:text-[var(--accent)]"}
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
          grid gap-4 sm:gap-5 md:gap-6 justify-items-center
          ${sidebarOpen 
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
          }
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