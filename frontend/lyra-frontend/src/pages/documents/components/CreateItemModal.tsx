// src/components/documents/CreateItemModal.tsx
import { X } from "lucide-react";

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  name: string;
  onNameChange: (value: string) => void;
  type: "document" | "folder";
  onTypeChange: (value: "document" | "folder") => void;
}

export default function CreateItemModal({
  isOpen,
  onClose,
  onCreate,
  name,
  onNameChange,
  type,
  onTypeChange,
}: CreateItemModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[var(--border)]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Item</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="create-item-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Create as
            </label>
            <select
              id="create-item-type"
              aria-label="Select item type: document or folder"
              value={type}
              onChange={(e) => onTypeChange(e.target.value as "document" | "folder")}
              className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            >
              <option value="document">Document</option>
              <option value="folder">Folder</option>
            </select>
          </div>

          <div>
            <label htmlFor="new-item-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Name
            </label>
            <input
              id="new-item-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              placeholder={type === "folder" ? "New Folder" : "New Document"}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCreate}
              disabled={!name.trim()}
              className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 disabled:opacity-50 transition font-medium"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)]/80 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}