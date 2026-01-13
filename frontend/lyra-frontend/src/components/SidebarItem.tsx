interface Props {
  label: string;
  onRename: () => void;
  onDelete: () => void;
}

export default function SidebarItem({ label, onRename, onDelete }: Props) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const action = window.prompt("rename / delete?");
    if (action === "rename") onRename();
    if (action === "delete") onDelete();
  };

  return (
    <div onContextMenu={handleContextMenu}>
      {label}
    </div>
  );
}
