// src/pages/documents/components/DocumentDetailsModal.tsx
import { X } from "lucide-react";
import type { Item } from "../../../types/document";

interface DocumentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Item | null;
}

export default function DocumentDetailsModal({
  isOpen,
  onClose,
  document,
}: DocumentDetailsModalProps) {
  if (!isOpen || !document) return null;

  const createdDate = new Date(document.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  const updatedDate = new Date(document.updated_at).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  const chapterCount = document.chapter_count || 0;
  const wordCount = document.word_count || 0;

  const avgChapterLength = chapterCount > 0 ? Math.round(wordCount / chapterCount) : 0;
  const avgSceneLength = 0; // We don't have per-scene data here, so we'll show 0 or remove if not available

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold">Document Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <div className="text-sm text-[var(--text-secondary)] mb-1">Title</div>
            <div className="font-medium text-lg break-words">{document.title}</div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">Created</div>
              <div>{createdDate}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">Last Modified</div>
              <div>{updatedDate}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">Chapters</div>
              <div className="text-lg font-semibold">{chapterCount}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">Total Words</div>
              <div className="text-lg font-semibold">{wordCount.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">Avg Chapter Length</div>
              <div className="text-lg font-medium">{avgChapterLength} words</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">Avg Scene Length</div>
              <div className="text-lg font-medium">—</div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}