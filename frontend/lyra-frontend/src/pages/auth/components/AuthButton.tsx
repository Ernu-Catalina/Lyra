// features/auth/components/AuthButton.tsx
import { ButtonHTMLAttributes } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export default function AuthButton({
  children,
  loading = false,
  disabled,
  className = "",
  ...props
}: AuthButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`
        w-full py-3 px-6 rounded-lg font-medium text-white
        bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dim)]
        hover:from-[var(--accent)]/90 hover:to-[var(--accent-dim)]/90
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]
        disabled:opacity-60 disabled:cursor-not-allowed
        transition duration-200 shadow-md hover:shadow-lg
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}