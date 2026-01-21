// src/components/molecules/DeleteConfirmationModal.tsx
import { X } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item?",
  message = "Are you sure you want to delete this? This action cannot be undone.",
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl max-w-md w-full p-6 shadow-2xl border border-[var(--border)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-[var(--text-secondary)] mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Delete
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
  );
}