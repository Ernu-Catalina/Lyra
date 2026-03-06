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
  const [isSaving, setIsSaving] = useState(false);

  // user settings from backend
  const [wordcountDisplay, setWordcountDisplay] = useState<string[]>([]);
  const [sceneFormat, setSceneFormat] = useState<string>("exact");
  const [chapterFormat, setChapterFormat] = useState<string>("exact");
  const [documentFormat, setDocumentFormat] = useState<string>("exact");
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
        const res = await api.get("/me");
        if (cancelled) return;
        const s = res.data.settings || {};
        if (Array.isArray(s.wordcount_display)) setWordcountDisplay(s.wordcount_display);
        setSceneFormat(s.scene_wordcount_format || "exact");
        setChapterFormat(s.chapter_wordcount_format || "exact");
        setDocumentFormat(s.document_wordcount_format || "exact");
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

    const timeout = setTimeout(async () => {
      try {
        await api.patch("/me/settings", {
          wordcount_display: wordcountDisplay,
          scene_wordcount_format: sceneFormat,
          chapter_wordcount_format: chapterFormat,
          document_wordcount_format: documentFormat,
          default_view: defaultView,
        });
        setSaveError("");
      } catch (err: any) {
        setSaveError(err.response?.data?.detail || "Could not save settings");
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [wordcountDisplay, sceneFormat, chapterFormat, documentFormat, defaultView, loadingSettings]);

  const handleToggleWordcount = (option: string) => {
    setWordcountDisplay((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 overflow-x-hidden">
      <div className="max-w-3xl mx-auto">
        {/* sticky header to avoid unwanted scrolling */}
        <header className="sticky top-0 bg-[var(--bg-primary)] py-4 z-20">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
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
                  {['scene', 'chapter', 'document'].map((opt) => (
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
              {/* New: separate format selectors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block font-medium mb-1">Scene Format</label>
                  <select
                    value={sceneFormat}
                    onChange={(e) => setSceneFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg"
                  >
                    <option value="exact">81579 (exact)</option>
                    <option value="exact_separated">81.579 (exact separated)</option>
                    <option value="rounded_up">81.6K (rounded up)</option>
                    <option value="truncated">81.5K (truncated)</option>
                    <option value="thousands_rounded_up">82K (thousands rounded up)</option>
                    <option value="thousands_truncated">81K (thousands truncated)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Chapter Format</label>
                  <select
                    value={chapterFormat}
                    onChange={(e) => setChapterFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg"
                  >
                    {/* same options as above */}
                    <option value="exact">81579 (exact)</option>
                    <option value="exact_separated">81.579 (exact separated)</option>
                    <option value="rounded_up">81.6K (rounded up)</option>
                    <option value="truncated">81.5K (truncated)</option>
                    <option value="thousands_rounded_up">82K (thousands rounded up)</option>
                    <option value="thousands_truncated">81K (thousands truncated)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Document Format</label>
                  <select
                    value={documentFormat}
                    onChange={(e) => setDocumentFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg"
                  >
                    {/* same options */}
                    <option value="exact">81579 (exact)</option>
                    <option value="exact_separated">81.579 (exact separated)</option>
                    <option value="rounded_up">81.6K (rounded up)</option>
                    <option value="truncated">81.5K (truncated)</option>
                    <option value="thousands_rounded_up">82K (thousands rounded up)</option>
                    <option value="thousands_truncated">81K (thousands truncated)</option>
                  </select>
                </div>
              </div>
            <h2 className="text-xl font-semibold mb-4">Default view</h2>
            <select
              value={defaultView}
              onChange={(e) => setDefaultView(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none"
            >
              <option value="scene">Scene</option>
              <option value="chapter">Chapter</option>
              <option value="document">Document</option>
            </select>
          </div>
          {/* Account Section */}
          <div className="pt-5">
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
