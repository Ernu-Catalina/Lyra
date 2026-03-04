import FolderGrid from "./FolderGrid";

import type { MouseEvent } from "react";

interface FolderGridSystemProps {
  folders: any[];
  onEnterFolder: (id: string, title: string) => void;  // ← changed
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  sidebarOpen: boolean;
  currentFolderId?: string | null;
  onContextMenu?: (e: MouseEvent, item?: any) => void;
}

export default function FolderGridSystem({
  folders,
  onEnterFolder,
  onEdit,
  onDelete,
  sidebarOpen,
  currentFolderId,
}: FolderGridSystemProps) {
  return (
    <FolderGrid
      folders={folders}
      onEnterFolder={onEnterFolder}
      onEdit={onEdit}
      onDelete={onDelete}
      sidebarOpen={sidebarOpen}
      currentFolderId={currentFolderId}
      onContextMenu={onContextMenu}
    />
  );
}