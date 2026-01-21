// src/components/NavigationBar.tsx
import { Search } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";
import { BookOpen } from "lucide-react";

interface NavigationBarProps {
  title: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onLogout: () => void;
  onSettings: () => void;
}

export default function NavigationBar({
  title,
  searchQuery,
  onSearchChange,
  onLogout,
  onSettings,
}: NavigationBarProps) {
  return (
    <nav className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 sm:px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <BookOpen className="h-6 w-6 text-[var(--accent)]" />
        <span className="text-xl font-semibold text-[var(--text-primary)]">{title}</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] w-56 lg:w-72 transition text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
          />
        </div>

        <ProfileDropdown onSettings={onSettings} onLogout={onLogout} />
      </div>
    </nav>
  );
}