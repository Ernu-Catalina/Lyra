// src/pages/documents/components/MoveConflictModal.tsx
import { X } from "lucide-react";

interface MoveConflictModalProps {
  isOpen: boolean;
  conflictingName: string;
  suggestedName: string;
  onCancel: () => void;
  onOverwrite: () => void;
  onRename: () => void;
}

export default function MoveConflictModal({
  isOpen,
  conflictingName,
  suggestedName,
  onCancel,
  onOverwrite,
  onRename,
}: MoveConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[var(--border)]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Name Conflict</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-[var(--text-primary)] mb-4">
          An item named <strong>"{conflictingName}"</strong> already exists in this folder.
          What would you like to do?
        </p>

        <div className="space-y-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 bg-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)]/80 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onOverwrite}
            className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition font-medium"
          >
            Overwrite existing
          </button>
          <button
            type="button"
            onClick={onRename}
            className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition font-medium"
          >
            Rename and keep both
          </button>
        </div>
      </div>
    </div>
  );
}
