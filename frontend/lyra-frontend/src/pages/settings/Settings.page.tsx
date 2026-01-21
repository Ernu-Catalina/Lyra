// src/features/settings/Settings.page.tsx
import { useTheme } from "../../context/ThemeContext";
import { BookOpen, Moon, Sun, Palette } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="card p-6 space-y-8">
          {/* Theme Selector */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Palette size={20} /> Appearance
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setTheme("light-modern")}
                className={`p-4 border rounded-lg text-center transition ${
                  theme === "light-modern"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--accent)]/50"
                }`}
              >
                <Sun className="mx-auto mb-2 h-6 w-6" />
                <div className="font-medium">Light Modern</div>
                <div className="text-sm text-[var(--text-secondary)]">Clean & bright</div>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark-minimal")}
                className={`p-4 border rounded-lg text-center transition ${
                  theme === "dark-minimal"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--accent)]/50"
                }`}
              >
                <Moon className="mx-auto mb-2 h-6 w-6" />
                <div className="font-medium">Dark Minimal</div>
                <div className="text-sm text-[var(--text-secondary)]">Sleek & low-light</div>
              </button>

              <button
                type="button"
                onClick={() => setTheme("sepia-classic")}
                className={`p-4 border rounded-lg text-center transition ${
                  theme === "sepia-classic"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--accent)]/50"
                }`}
              >
                <BookOpen className="mx-auto mb-2 h-6 w-6" />
                <div className="font-medium">Sepia Classic</div>
                <div className="text-sm text-[var(--text-secondary)]">Book-like warmth</div>
              </button>
            </div>
          </div>

          {/* Future sections: Account, Notifications, etc. */}
          <div className="border-t border-[var(--border)] pt-6">
            <h2 className="text-xl font-semibold mb-4">Account</h2>
            <p className="text-[var(--text-secondary)]">More settings coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}