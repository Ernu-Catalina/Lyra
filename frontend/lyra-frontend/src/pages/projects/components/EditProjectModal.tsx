// src/pages/projects/components/EditProjectModal.tsx
import { X } from "lucide-react";
import type { Project } from "../Projects.page";

interface EditProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onSave: () => void;
  name: string;
  setName: (name: string) => void;
  coverUrl: string;
  setCoverUrl: (url: string) => void;
}

export function EditProjectModal({
  project,
  onClose,
  onSave,
  name,
  setName,
  coverUrl,
  setCoverUrl,
}: EditProjectModalProps) {
  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[var(--border)]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Edit Project</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1"
            aria-label="Close edit modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="edit-project-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Project Name
            </label>
            <input
              id="edit-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label htmlFor="edit-cover-url" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Cover Image URL (optional)
            </label>
            <input
              id="edit-cover-url"
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
              onClick={onSave}
              disabled={!name.trim()}
              className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 disabled:opacity-50 transition font-medium"
            >
              Save Changes
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