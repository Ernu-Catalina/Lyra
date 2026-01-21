// src/components/sidebar/ProjectCoverSidebar.tsx
import { ChevronLeft } from "lucide-react";
import { Project } from "../../../types/document";

interface ProjectCoverSidebarProps {
  project: Project | null;
  isOpen: boolean;
  onToggle: () => void;
}

// src/components/sidebar/ProjectCoverSidebar.tsx

export default function ProjectCoverSidebar({ project, isOpen, onToggle }: ProjectCoverSidebarProps) {
  return (
    <aside
      className={`
        bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-all duration-300
        ${isOpen ? "w-80 lg:w-96" : "w-0"}
        overflow-hidden flex-shrink-0
        fixed inset-y-0 left-0 z-40 lg:relative lg:inset-auto
        h-screen   /* full height */
      `}
    >
      {isOpen && (
        <div className="h-full flex flex-col">
          {/* Cover – fills remaining space, no scroll */}
          <div className="flex-1 relative bg-gradient-to-br from-[var(--accent)] to-indigo-600 overflow-hidden">
            {project?.cover_image_url ? (
              <img
                src={project.cover_image_url}
                alt={`${project.name} cover`}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl font-bold text-white opacity-30">
                  {project?.name?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
            )}
          </div>

          {/* Close button – always visible */}
          <button
            type="button"
            onClick={onToggle}
            className="absolute top-4 right-4 bg-transparent p-2 hover:bg-[var(--accent)]/20 rounded-full transition z-50"
            aria-label="Close sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      )}
    </aside>
  );
}