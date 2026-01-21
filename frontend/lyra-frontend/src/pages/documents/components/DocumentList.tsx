// src/components/documents/DocumentList.tsx
import FolderGridSystem from "./FolderGridSystem";
import DocumentListItem from "./DocumentListItem";
import DocumentHeader from "./DocumentHeader";

interface DocumentListProps {
  items: any[];
  onEnterFolder: (id: string) => void;
  onNavigateDocument: (id: string) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  sidebarOpen: boolean;  // ← add this
}

export default function DocumentList({
  items,
  onEnterFolder,
  onNavigateDocument,
  onEdit,
  onDelete,
}: DocumentListProps) {
  const folders = items.filter(i => i.type === "folder");
  const documents = items.filter(i => i.type === "document");

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Folders Grid */}
      <FolderGridSystem
        folders={folders}
        onEnterFolder={onEnterFolder}
        onEdit={onEdit}  
        onDelete={onDelete}
        sidebarOpen={false}
      />

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <div className="divide-y divide-[var(--border)]/30">
            <DocumentHeader />
            {documents.map((doc) => (
              <DocumentListItem
                key={doc._id}
                document={doc}
                onNavigate={() => onNavigateDocument(doc._id)}
                onEdit={() => onEdit(doc)}
                onDelete={() => onDelete(doc._id)}
              />
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