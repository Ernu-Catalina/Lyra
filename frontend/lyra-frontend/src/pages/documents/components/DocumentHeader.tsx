// src/pages/documents/components/DocumentHeader.tsx

interface DocumentHeaderProps {
  isMobileView?: boolean;
}

export default function DocumentHeader({ isMobileView = false }: DocumentHeaderProps) {
  return (
    <div className={`
      grid border-b border-[var(--border)] bg-[var(--bg-secondary)] py-3 px-6 
      text-sm font-medium text-[var(--text-secondary)]
      ${isMobileView 
        ? "grid-cols-[3fr_1fr]" 
        : "grid-cols-[3fr_1fr_1fr_1fr_1fr]"
      } 
      gap-6 items-center
    `}>
      {/* Title */}
      <div className="font-semibold text-[var(--text-primary)]">
        Title
      </div>

      {/* Last Modified - always visible */}
      <div className="text-right font-semibold text-[var(--text-primary)]">
        Modified
      </div>

      {/* Other columns - hidden on mobile */}
      {!isMobileView && (
        <>
          <div className="text-right font-semibold text-[var(--text-primary)]">
            Created
          </div>
          <div className="text-right font-semibold text-[var(--text-primary)]">
            Chapters
          </div>
          <div className="text-right font-semibold text-[var(--text-primary)]">
            Words
          </div>
        </>
      )}
    </div>
  );
}