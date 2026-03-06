import { cn } from "../utils/utils"; // ← add this helper if you don't have it yet

interface ToolbarButtonProps {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}

export function ToolbarButton({
  children,
  active = false,
  onClick,
  title,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
        active
          ? "bg-[var(--accent)]/20 text-[var(--accent)]"
          : "hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}