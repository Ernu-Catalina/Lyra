// src/features/settings/Settings.page.tsx
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { BookOpen, Moon, Sun, Palette, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import api from "../../api/client";
import DeleteAccountModal from "./DeleteAccountModal";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // user settings from backend
  const [wordcountDisplay, setWordcountDisplay] = useState<string[]>([]);
  const [wordcountFormat, setWordcountFormat] = useState<string>("exact");
  const [defaultView, setDefaultView] = useState<string>("document");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saveError, setSaveError] = useState("");

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await api.delete("/auth/delete-account");
      logout();
      setDeleteAccountOpen(false);
      navigate("/login");
    } catch (err: any) {
      console.error("Delete account error:", err);
      setDeleteError(err.response?.data?.detail || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  // fetch current user settings on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get("/users/me");
        if (cancelled) return;
        const s = res.data.settings || {};
        if (Array.isArray(s.wordcount_display)) setWordcountDisplay(s.wordcount_display);
        if (s.wordcount_format) setWordcountFormat(s.wordcount_format);
        if (s.default_view) setDefaultView(s.default_view);
        // if backend stored theme matches one of our options, apply
        if (typeof s.theme === "string" && ["light-modern", "dark-minimal", "sepia-classic"].includes(s.theme)) {
          setTheme(s.theme as any);
        }
      } catch (e) {
        console.error("Failed to load user settings", e);
      } finally {
        setLoadingSettings(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  // save settings when they change (excluding theme to avoid backend validation issues)
  useEffect(() => {
    if (loadingSettings) return;
    const patch = async () => {
      try {
        await api.patch("/users/me/settings", {
          wordcount_display: wordcountDisplay,
          wordcount_format: wordcountFormat,
          default_view: defaultView,
        });
        setSaveError("");
      } catch (err: any) {
        console.error("Failed to save settings", err);
        setSaveError(err.response?.data?.detail || "Could not save settings");
      }
    };
    patch();
  }, [wordcountDisplay, wordcountFormat, defaultView, loadingSettings]);

  const handleToggleWordcount = (option: string) => {
    setWordcountDisplay((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const formatExample = () => {
    switch (wordcountFormat) {
      case "rounded":
        return "1.2k";
      case "abbreviated":
        return "1k";
      default:
        return "1234";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 overflow-x-hidden">
      <div className="max-w-3xl mx-auto">
        {/* sticky header to avoid unwanted scrolling */}
        <header className="sticky top-0 bg-[var(--bg-primary)] py-4 z-20">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
        </header>

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
          {/* Additional user settings */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Word count</h2>
            <div className="space-y-4">
              <div>
                <span className="font-medium">Display</span>
                <div className="flex gap-4 mt-2">
                  {['chapter', 'scene', 'document'].map((opt) => (
                    <label key={opt} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={wordcountDisplay.includes(opt)}
                        onChange={() => handleToggleWordcount(opt)}
                        className="form-checkbox h-4 w-4 text-[var(--accent)]"
                      />
                      <span className="capitalize text-[var(--text-primary)]">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Format</label>
                <select
                  value={wordcountFormat}
                  onChange={(e) => setWordcountFormat(e.target.value)}
                  className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none"
                >
                  <option value="exact">Exact</option>
                  <option value="rounded">Rounded</option>
                  <option value="abbreviated">Abbreviated</option>
                </select>
                <div className="text-sm text-[var(--text-secondary)] mt-1">Example: {formatExample()}</div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Default view</h2>
            <select
              value={defaultView}
              onChange={(e) => setDefaultView(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none"
            >
              <option value="chapter">Chapter</option>
              <option value="scene">Scene</option>
              <option value="document">Document</option>
            </select>
          </div>
          {/* Account Section */}
          <div className="border-t border-[var(--border)] pt-6">
            <h2 className="text-xl font-semibold mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Danger Zone</h3>
                <button
                  type="button"
                  onClick={() => setDeleteAccountOpen(true)}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={18} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error notifications */}
      {deleteError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--accent)] text-[var(--accent)] px-6 py-3 rounded shadow-lg z-50">
          {deleteError}
        </div>
      )}
      {saveError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--accent)] text-[var(--accent)] px-6 py-3 rounded shadow-lg z-50">
          {saveError}
        </div>
      )}

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
      />
    </div>
  );
}
