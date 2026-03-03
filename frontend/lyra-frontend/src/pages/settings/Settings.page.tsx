// src/features/settings/Settings.page.tsx
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { BookOpen, Moon, Sun, Palette, Trash2 } from "lucide-react";
import { useState } from "react";
import api from "../../api/client";
import DeleteAccountModal from "./DeleteAccountModal";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={18} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {deleteError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow-lg z-50">
          {deleteError}
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