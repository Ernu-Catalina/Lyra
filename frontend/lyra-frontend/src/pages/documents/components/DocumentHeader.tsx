// src/components/documents/DocumentHeader.tsx
export default function DocumentHeader() {
  return (
    <div
      className="
        grid grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-6 px-6 py-3 
        text-sm font-semibold text-[var(--text-primary)] 
        sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]/30
      "
    >
      {/* Title – same width as document items */}
      <div className="pl-10">Title</div> {/* pl-10 matches icon + gap in DocumentListItem */}

      {/* Created Date – right-aligned */}
      <div className="text-right">Created</div>

      {/* Last Modified – right-aligned */}
      <div className="text-right">Last Modified</div>

      {/* Chapters – right-aligned, centered label */}
      <div className="text-right">Chapters</div>

      {/* Words – right-aligned, centered label */}
      <div className="text-right">Wordcount</div>
    </div>
  );
}