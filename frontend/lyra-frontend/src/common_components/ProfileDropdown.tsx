// src/components/ProfileDropdown.tsx
import { useState, useRef, useEffect } from "react";
import { Settings, LogOut, User } from "lucide-react";

interface ProfileDropdownProps {
  onSettings: () => void;
  onLogout: () => void;
}

export default function ProfileDropdown({ onSettings, onLogout }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:bg-[var(--border)]/30 rounded-full p-1 transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        aria-label="User profile menu"       
        title="User profile menu"                
      >
        <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center text-white font-medium">
          <User size={16} />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] rounded-lg shadow-xl border border-[var(--border)] py-1 z-50">
          <button
            type="button"
            onClick={() => {
              onSettings();
              setOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--accent)]/10 flex items-center gap-2 transition"
          >
            <Settings size={16} /> Settings
          </button>
          <button
            type="button"
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      )}
    </div>
  );
}