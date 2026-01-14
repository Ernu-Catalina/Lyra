// src/features/projects/Projects.page.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import { Plus, Search, Settings, LogOut, Edit, Pin, PinOff, Trash2, X, BookOpen } from "lucide-react";

interface Project {
  _id: string;
  name: string;
  created_at: string;
  updated_at: string;
  cover_image_url?: string;
  pinned?: boolean;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated-desc" | "name-asc" | "name-desc">("updated-desc");

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");

  // Edit modal state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");

  // Profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        setError("Failed to load projects");
      }
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createProject = async () => {
    if (!newProjectName.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      const payload = {
        name: newProjectName.trim(),
        cover_image_url: newCoverUrl.trim() || undefined,
      };

      await api.post("/projects", payload);
      setNewProjectName("");
      setNewCoverUrl("");
      setCreateModalOpen(false);
      setError("");
      fetchProjects();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create project");
    }
  };

  const updateProject = async () => {
    if (!editProject || !editName.trim()) return;

    try {
      await api.patch(`/projects/${editProject._id}`, {
        name: editName.trim(),
        cover_image_url: editCoverUrl.trim() || null,
      });
      setEditProject(null);
      setError("");
      fetchProjects();
    } catch (err: any) {
      setError("Failed to update project");
    }
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project? This cannot be undone.")) return;

    try {
      await api.delete(`/projects/${id}`);
      setError("");
      fetchProjects();
    } catch (err: any) {
      setError("Failed to delete project");
    }
  };

  const togglePin = async (project: Project) => {
    const newPinned = !project.pinned;
    const pinnedCount = projects.filter((p) => p.pinned).length;

    if (newPinned && pinnedCount >= 3) {
      alert("You can pin up to 3 projects only.");
      return;
    }

    try {
      await api.patch(`/projects/${project._id}`, { pinned: newPinned });
      fetchProjects();
    } catch (err: any) {
      setError("Failed to update pin status");
    }
  };

  // Sort & filter
  const sortedAndFiltered = [...projects]
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Navigation Bar */}
      <nav className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Logo + Projects title */}
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-6 w-6 text-[var(--accent)]" />
          <span className="text-xl font-semibold text-[var(--text-primary)]">Projects</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] w-56 lg:w-72 transition text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            />
          </div>

          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 hover:bg-[var(--border)]/30 rounded-full p-1 transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full"
            >
              <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center text-white font-medium">
                U
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] rounded-lg shadow-xl border border-[var(--border)] py-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/settings");
                    setProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--accent)]/10 flex items-center gap-2 transition"
                >
                  <Settings size={16} /> Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Header area – sort left, create right, smaller padding */}
      <div className="max-w-[96%] mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Left: Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="sort-projects" className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sort-projects"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none min-w-[160px] text-[var(--text-primary)]"
            >
              <option value="updated-desc">Recently updated</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
            </select>
          </div>

          {/* Right: Create button – theme-aware */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className={`
              flex items-center justify-center w-10 h-10 
              bg-[var(--bg-secondary)] text-[var(--text-secondary)] 
              rounded-full 
              hover:bg-[var(--accent)]/10 
              transition-all duration-200 
              shadow-sm 
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]
              self-end sm:self-auto
            `}
            aria-label="Create new project"
          >
            <Plus size={20} className="text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Project grid */}
        {sortedAndFiltered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            {searchQuery ? "No projects match your search" : "No projects yet — click + to create one!"}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
            {sortedAndFiltered.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/projects/${project._id}`)}
                className="group card overflow-hidden hover:shadow-md hover:border-[var(--accent)]/50 transition cursor-pointer"
              >
                <div className="relative aspect-[6/9] bg-gradient-to-br from-[var(--accent)] to-indigo-600 overflow-hidden">
                  {project.cover_image_url ? (
                    <img
                      src={project.cover_image_url}
                      alt={project.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-8xl font-bold text-white opacity-30">
                        {project.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition line-clamp-2 flex-1 pr-2">
                      {project.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(project);
                      }}
                      className="p-1 hover:bg-[var(--border)]/50 rounded-full transition"
                      aria-label={project.pinned ? "Unpin project" : "Pin project (max 3)"}
                    >
                      {project.pinned ? <PinOff size={18} className="text-[var(--accent)]" /> : <Pin size={18} className="text-[var(--text-secondary)]" />}
                    </button>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProject(project);
                        setEditName(project.name);
                        setEditCoverUrl(project.cover_image_url || "");
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-[var(--border)]/50 hover:bg-[var(--border)] rounded transition flex items-center justify-center gap-1 text-[var(--text-primary)]"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project._id);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition flex items-center justify-center gap-1"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[var(--border)]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Project</h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1"
                aria-label="Close create modal"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="create-project-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Project Name
                </label>
                <input
                  id="create-project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  placeholder="My New Novel"
                />
              </div>

              <div>
                <label htmlFor="create-cover-url" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Cover Image URL (optional)
                </label>
                <input
                  id="create-cover-url"
                  type="url"
                  value={newCoverUrl}
                  onChange={(e) => setNewCoverUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
                {newCoverUrl && (
                  <div className="mt-3">
                    <p className="text-sm text-[var(--text-secondary)] mb-1">Preview:</p>
                    <img
                      src={newCoverUrl}
                      alt="Cover preview"
                      className="w-32 h-48 object-cover rounded-md border border-[var(--border)]"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={createProject}
                  disabled={!newProjectName.trim()}
                  className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 disabled:opacity-50 transition font-medium"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)]/80 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (also theme-aware) */}
      {editProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[var(--border)]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Edit Project</h2>
              <button
                type="button"
                onClick={() => setEditProject(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1"
                aria-label="Close edit modal"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="edit-project-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Project Name
                </label>
                <input
                  id="edit-project-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="edit-cover-url" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Cover Image URL (optional)
                </label>
                <input
                  id="edit-cover-url"
                  type="url"
                  value={editCoverUrl}
                  onChange={(e) => setEditCoverUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
                {editCoverUrl && (
                  <div className="mt-3">
                    <p className="text-sm text-[var(--text-secondary)] mb-1">Preview:</p>
                    <img
                      src={editCoverUrl}
                      alt="Cover preview"
                      className="w-32 h-48 object-cover rounded-md border border-[var(--border)]"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={updateProject}
                  disabled={!editName.trim()}
                  className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 disabled:opacity-50 transition font-medium"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditProject(null)}
                  className="flex-1 py-2.5 bg-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)]/80 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}