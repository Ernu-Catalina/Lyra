import FolderGrid from "./FolderGrid";

interface FolderGridSystemProps {
  folders: any[];
  onEnterFolder: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  sidebarOpen: boolean;
}

export default function FolderGridSystem({
  folders,
  onEnterFolder,
  onEdit,
  onDelete,
  sidebarOpen,
}: FolderGridSystemProps) {
  return (
    <FolderGrid
      folders={folders}
      onEnterFolder={onEnterFolder}
      onEdit={onEdit}
      onDelete={onDelete}
      sidebarOpen={sidebarOpen}
    />
  );
}