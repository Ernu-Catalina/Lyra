// src/pages/projects/components/ProjectCard.tsx
import { Edit, Pin, PinOff, Trash2 } from "lucide-react";
import type { Project } from "../Projects.page";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onTogglePin: (project: Project) => void;
  onNavigate: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onDelete, onTogglePin, onNavigate }: ProjectCardProps) {
  return (
    <div
      onClick={() => onNavigate(project._id)}
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
              onTogglePin(project);
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
              onEdit(project);
            }}
            className="flex-1 px-3 py-1.5 text-xs bg-[var(--border)]/50 hover:bg-[var(--border)] rounded transition flex items-center justify-center gap-1 text-[var(--text-primary)]"
          >
            <Edit size={14} /> Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project._id);
            }}
            className="flex-1 px-3 py-1.5 text-xs bg-[var(--border)]/50 hover:bg-[var(--border)] rounded transition flex items-center justify-center gap-1 text-[var(--text-primary)]"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}