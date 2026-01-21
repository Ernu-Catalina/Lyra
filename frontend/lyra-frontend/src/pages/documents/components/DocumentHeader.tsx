// src/components/documents/DocumentHeader.tsx
export default function DocumentHeader() {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-secondary)]/30 sticky top-0 z-10 backdrop-blur-sm">
      <div className="col-span-4">Title</div>
      <div className="col-span-3">Last Modified</div>
      <div className="col-span-2 text-center">Chapters</div>
      <div className="col-span-2 text-center">Words</div>
    </div>
  );
}