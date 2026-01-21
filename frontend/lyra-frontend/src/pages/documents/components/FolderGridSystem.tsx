import FolderGrid from "./FolderGrid";

interface FolderGridSystemProps {
  folders: any[];
  onEnterFolder: (id: string, title: string) => void;  // ← changed
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  sidebarOpen: boolean;
  currentFolderId?: string | null;
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
    />
  );
}