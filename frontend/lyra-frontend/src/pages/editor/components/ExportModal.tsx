import { useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, File } from "lucide-react";

interface ExportModalProps {
  onClose: () => void;
  onExport: (format: "pdf" | "docx") => Promise<void>;
}

export function ExportModal({ onClose, onExport }: ExportModalProps) {
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: "pdf" | "docx") => {
    setExporting(format);
    setError(null);
    try {
      await onExport(format);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Export Document
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Export all chapters with your current document settings applied.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleExport("docx")}
            disabled={!!exporting}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={20} className="text-blue-500" />
            <div className="text-left">
              <div className="font-medium text-sm">Word Document (.docx)</div>
              <div className="text-xs text-[var(--text-secondary)]">
                Compatible with Microsoft Word and Google Docs
              </div>
            </div>
            {exporting === "docx" && (
              <span className="ml-auto text-xs text-[var(--text-secondary)]">
                Exporting…
              </span>
            )}
          </button>

          <button
            onClick={() => handleExport("pdf")}
            disabled={!!exporting}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <File size={20} className="text-red-500" />
            <div className="text-left">
              <div className="font-medium text-sm">PDF Document (.pdf)</div>
              <div className="text-xs text-[var(--text-secondary)]">
                Fixed layout, perfect for sharing and printing
              </div>
            </div>
            {exporting === "pdf" && (
              <span className="ml-auto text-xs text-[var(--text-secondary)]">
                Exporting…
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded border border-red-400 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}