// src/components/documents/DocumentList.tsx
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import FolderGridSystem from "./FolderGridSystem";
import DocumentListItem from "./DocumentListItem";
import DocumentHeader from "./DocumentHeader";
import type { Item } from "../../types/document";  // ← Item can be folder or document

interface DocumentListProps {
  items: Item[];
  onEnterFolder: (id: string, title: string) => void;   // ← now needs title
  onNavigateDocument: (id: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  sidebarOpen: boolean;
  currentFolderId: string | null;   // ← add this
}

export default function DocumentList({
  items,
  onEnterFolder,
  onNavigateDocument,
  onEdit,
  onDelete,
  currentFolderId,
}: DocumentListProps) {
  const folders = items.filter((i) => i.type === "folder");
  const documents = items.filter((i) => i.type === "document");

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,         
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Folders Grid - each folder is droppable */}
      <FolderGridSystem
        folders={folders}
        onEnterFolder={onEnterFolder}
        onEdit={onEdit}
        onDelete={onDelete}
        sidebarOpen={false}
        currentFolderId={currentFolderId}
      />

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="mt-8">
          <DocumentHeader />
          <div className="divide-y divide-[var(--border)]/30">
            {documents.map((doc) => (
              <SortableItem key={doc._id} id={doc._id}>
                <DocumentListItem
                  document={doc}
                  onNavigate={() => onNavigateDocument(document._id)}
                  onEdit={() => onEdit(doc)}
                  onDelete={() => onDelete(doc._id)}
                />
              </SortableItem>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          No items yet — click 'Create Draft' to start!
        </div>
      )}
    </div>
  );
}