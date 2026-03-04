import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteAccountModalProps) {
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      setIsCountingDown(true);
      return;
    }

    if (countdown > 0 && isCountingDown) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setIsCountingDown(false);
    }
  }, [countdown, isOpen, isCountingDown]);

  if (!isOpen) return null;

  const isDeleteDisabled = countdown > 0 || isLoading;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl max-w-md w-full p-6 shadow-2xl border border-[var(--accent)]/30">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--accent)]">Delete Your Account?</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-[var(--text-secondary)] font-semibold text-sm">⚠️ Warning</p>
          <p className="text-[var(--text-primary)]">
            This action is <strong>permanent and cannot be undone</strong>. All your projects, documents, folders, chapters, scenes, and personal data will be <strong>permanently deleted</strong>. There is no way to recover anything after deletion.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleteDisabled}
            className={`flex-1 py-2.5 rounded-lg transition font-medium ${
              isDeleteDisabled
                ? "bg-[var(--accent)]/50 text-white/50 cursor-not-allowed"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90"
            }`}
          >
            {isLoading ? "Deleting..." : `Delete Account${countdown > 0 ? ` (${countdown}s)` : ""}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)]/80 transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
