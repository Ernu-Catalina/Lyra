// features/projects/Projects.page.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import axios from "axios";

interface Project {
  _id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newProjectName, setNewProjectName] = useState("");

  const { logout } = useAuth();
  const navigate = useNavigate();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
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
    if (!newProjectName.trim()) return;
    try {
      await api.post("/projects", { name: newProjectName.trim() });
      setNewProjectName("");
      await fetchProjects();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        setError("Failed to create project");
      }
    }
  };

  if (loading) return <p>Loading projects...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => { logout(); navigate("/login"); }}>
          Logout
        </button>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <input
          placeholder="New project name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
        />
        <button onClick={createProject} disabled={!newProjectName.trim()}>
          Create Project
        </button>
      </div>

      <h2>Your Projects</h2>

      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li
              key={project._id}
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => navigate(`/projects/${project._id}`)}
            >
              {project.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}