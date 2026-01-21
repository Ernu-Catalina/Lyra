// src/pages/projects/components/CreateProjectModal.tsx
import { X } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  name: string;
  setName: (name: string) => void;
  coverUrl: string;
  setCoverUrl: (url: string) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreate,
  name,
  setName,
  coverUrl,
  setCoverUrl,
}: CreateProjectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[var(--border)]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Project</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1"
            aria-label="Close create modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="create-project-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Project Name
            </label>
            <input
              id="create-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              placeholder="My New Novel"
            />
          </div>

          <div>
            <label htmlFor="create-cover-url" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Cover Image URL (optional)
            </label>
            <input
              id="create-cover-url"
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            />
            {coverUrl && (
              <div className="mt-3">
                <p className="text-sm text-[var(--text-secondary)] mb-1">Preview:</p>
                <img
                  src={coverUrl}
                  alt="Cover preview"
                  className="w-32 h-48 object-cover rounded-md border border-[var(--border)]"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCreate}
              disabled={!name.trim()}
              className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 disabled:opacity-50 transition font-medium"
            >
              Create Project
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