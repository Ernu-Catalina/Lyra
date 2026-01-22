// features/auth/components/AuthLink.tsx
import { Link } from "react-router-dom";

interface AuthLinkProps {
  to: string;
  children: React.ReactNode;
}

export default function AuthLink({ to, children }: AuthLinkProps) {
  return (
    <Link
      to={to}
      className="text-[var(--accent)] hover:text-[var(--accent-dim)] font-medium transition"
    >
      {children}
    </Link>
  );
}