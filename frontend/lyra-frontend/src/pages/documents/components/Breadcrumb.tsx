import { ChevronRight } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

interface BreadcrumbProps {
  path: Array<{ id: string | null; title: string }>;
  onClick: (index: number) => void;
  currentFolderId: string | null;
}

interface BreadcrumbItemProps {
  crumb: { id: string | null; title: string };
  idx: number;
  onClick: (index: number) => void;
  currentFolderId: string | null;
}

function BreadcrumbItem({ crumb, idx, onClick, currentFolderId }: BreadcrumbItemProps) {
  const { setNodeRef } = useDroppable({
    id: crumb.id ?? "root",
  });

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {idx > 0 && <ChevronRight size={14} className="text-[var(--border)]" />}
      <button
        ref={setNodeRef}
        onClick={() => onClick(idx)}
        className={`
          hover:text-[var(--accent)] transition px-11 py-0.5 rounded
          ${crumb.id === currentFolderId ? "text-[var(--accent)] font-medium" : ""}
        `}
      >
        {crumb.title}
      </button>
    </div>
  );
}

export default function Breadcrumb({ path, onClick, currentFolderId }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] py-2 px-1 overflow-x-auto">
      {path.map((crumb, idx) => (
        <BreadcrumbItem
          key={crumb.id ?? "root"}
          crumb={crumb}
          idx={idx}
          onClick={onClick}
          currentFolderId={currentFolderId}
        />
      ))}
    </nav>
  );
}