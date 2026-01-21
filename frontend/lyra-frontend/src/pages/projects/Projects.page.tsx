// src/pages/projects/Projects.page.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import NavigationBar from "../../common_components/NavigationBar";
import CreateButton from "../../common_components/CreateButton";
import { ProjectCard } from "./components/ProjectCard";
import { CreateProjectModal } from "./components/CreateProjectModal";
import { EditProjectModal } from "./components/EditProjectModal";

export interface Project {
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

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");

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
      {/* Reusable Navigation Bar */}
      <NavigationBar
        title="Projects"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={() => {
          logout();
          navigate("/login");
        }}
        onSettings={() => navigate("/settings")}
      />

      {/* Header area – sort left, create right, smaller padding */}
      <div className="max-w-[96%] mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Left: Create Project */}
          <CreateButton
            onClick={() => setCreateModalOpen(true)}
            label="Create Project"
          />

          {/* Right: Sort */}
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
        </div>

        {/* Project grid */}
        {sortedAndFiltered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            {searchQuery ? "No projects match your search" : "No projects yet — click + to create one!"}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
            {sortedAndFiltered.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onEdit={(p) => {
                  setEditProject(p);
                  setEditName(p.name);
                  setEditCoverUrl(p.cover_image_url || "");
                }}
                onDelete={deleteProject}
                onTogglePin={togglePin}
                onNavigate={(id) => navigate(`/projects/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={createProject}
        name={newProjectName}
        setName={setNewProjectName}
        coverUrl={newCoverUrl}
        setCoverUrl={setNewCoverUrl}
      />

      <EditProjectModal
        project={editProject}
        onClose={() => setEditProject(null)}
        onSave={updateProject}
        name={editName}
        setName={setEditName}
        coverUrl={editCoverUrl}
        setCoverUrl={setEditCoverUrl}
      />
    </div>
  );
}