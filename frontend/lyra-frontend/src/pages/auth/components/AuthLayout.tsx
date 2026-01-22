// features/auth/components/AuthLayout.tsx
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Brand / Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[var(--accent)] via-[var(--accent-dim)] to-[var(--accent)] bg-clip-text text-transparent tracking-tight">
            DraftFlow
          </h1>
          <p className="mt-2 text-[var(--text-secondary)] text-lg">
            Write better, together.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-xl p-8 transition-colors duration-300">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] text-center mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[var(--text-secondary)] text-center mb-8">{subtitle}</p>
          )}

          {children}
        </div>

        <p className="text-center text-[var(--text-secondary)] text-sm mt-8">
          © {new Date().getFullYear()} DraftFlow
        </p>
      </div>
    </div>
  );
}