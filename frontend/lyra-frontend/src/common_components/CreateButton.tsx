// src/components/atoms/CreateButton.tsx
import { Plus } from "lucide-react";

interface CreateButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}

export default function CreateButton({ onClick, label, disabled = false }: CreateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-5 py-2.5 
        bg-[var(--bg-secondary)] text-[var(--text-primary)] 
        border border-[var(--border)] 
        rounded-lg font-medium text-sm
        hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/50
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]
      `}
      aria-label={label}
    >
      <Plus size={18} />
      {label}
    </button>
  );
}