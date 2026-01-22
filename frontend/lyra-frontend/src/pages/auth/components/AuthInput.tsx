// features/auth/components/AuthInput.tsx
import { forwardRef, InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, id: providedId, ...props }, ref) => {
    const id = providedId || `${label.toLowerCase().replace(/\s+/g, "-")}-input`;

    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          className={`
            w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] 
            border border-[var(--border)] 
            text-[var(--text-primary)] placeholder-[var(--text-secondary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
            transition duration-200
            ${error ? "border-red-500 focus:ring-red-500" : ""}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${id}-error`} className="text-red-600 text-sm mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";

export default AuthInput;