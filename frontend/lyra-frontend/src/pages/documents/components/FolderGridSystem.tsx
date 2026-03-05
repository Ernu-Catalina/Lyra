import FolderGrid from "./FolderGrid";

import type { MouseEvent } from "react";

interface FolderGridSystemProps {
  folders: any[];
  onEnterFolder: (id: string, title: string) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  sidebarOpen: boolean;
  currentFolderId?: string | null;
  onContextMenu?: (e: MouseEvent, item?: any) => void;   // ← fixed: now accepts it
}

export default function FolderGridSystem({
  folders,
  onEnterFolder,
  onEdit,
  onDelete,
  sidebarOpen,
  currentFolderId,
  onContextMenu,   // ← now destructured
}: FolderGridSystemProps) {
  return (
    <FolderGrid
      folders={folders}
      onEnterFolder={onEnterFolder}
      onEdit={onEdit}
      onDelete={onDelete}
      sidebarOpen={sidebarOpen}          // ← use real value
      currentFolderId={currentFolderId}
      onContextMenu={onContextMenu}      // ← now passed safely
    />
  );
}