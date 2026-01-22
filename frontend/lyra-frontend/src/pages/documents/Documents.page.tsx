// src/pages/Documents.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import NavigationBar from "../../common_components/NavigationBar";
import ProjectCoverSidebar from "../documents/components/ProjectCoverSidebar";
import DocumentList from "../documents/components/DocumentList";
import EditItemModal from "../documents/components/EditItemModal";
import CreateItemModal from "../documents/components/CreateItemModal";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal";
import { ChevronLeft, Menu } from "lucide-react";
import CreateButton from "../../common_components/CreateButton";
import { Project } from "../../types/document";
import Breadcrumb from "./components/Breadcrumb";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { FileText } from "lucide-react";

interface Item {
  _id: string;
  title: string;
  type: "document" | "folder";
  created_at: string;
  updated_at: string;
  chapter_count?: number;
  word_count?: number;
  parent_id?: string | null;
}

export default function Documents() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated-desc" | "title-asc" | "title-desc">("updated-desc");

  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop default: open
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<string[]>([]);
  const [folderPath, setFolderPath] = useState<Array<{ id: string | null; title: string }>>([
  { id: null, title: project?.name || "Project Root" },
]);

  useEffect(() => {
    if (project) {
      setFolderPath(prev => [{ id: null, title: project.name }, ...prev.slice(1)]);
    }
  }, [project]);

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"document" | "folder">("document");

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editItemName, setEditItemName] = useState("");

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Require 8px movement to start drag, preventing accidental drags on clicks
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

const [activeDocumentTitle, setActiveDocumentTitle] = useState<string>("");
const [activeTitle, setActiveTitle] = useState<string>("");

const handleDragStart = (event: any) => {
  setActiveId(event.active.id as string);
  const item = items.find(i => i._id === event.active.id);
  setActiveTitle(item?.title || "Untitled");
};

const handleDragEnd = async (event) => {
  const { active, over } = event;
  if (!over) return;

  const activeId = active.id as string;
  const overId = over.id as string;

  console.log("[DRAG-END] Moving item:", activeId);
  console.log("[DRAG-END] Dropped on:", overId, "(type:", typeof overId, ")");
  console.log("[DRAG-END] Current folder:", currentFolderId);

  const item = items.find(i => i._id === activeId);
  if (!item || item.type !== "document") return;

  const newParent = overId === "root" ? null : overId;
  console.log("[DRAG-END] New parent_id:", newParent);

  // Optimistic update: remove from current list
  setItems(prev => prev.filter(i => i._id !== activeId));

  try {
    const response = await api.patch(`/projects/${projectId}/documents/${activeId}`, {
      parent_id: newParent,
    });
    console.log("[PATCH] Status:", response.status);
    console.log("[PATCH] Response data:", response.data);

    await fetchData();                    // ← refetch to confirm
    console.log("[AFTER REFETCH] Items now:", items.length, items.map(i => i.title));
  } catch (err) {
    console.error("[PATCH ERROR]", err.response?.data || err.message);
    setError("Move failed – check console");
    // Rollback: add back to list
    setItems(prev => [...prev, item]);
  }
};

const isDescendant = (parentId: string | null, childId: string): boolean => {
  if (parentId === null) return false;
  const queue = [parentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = items.filter(i => i.parent_id === current);
    for (const child of children) {
      if (child._id === childId) return true;
      queue.push(child._id);
    }
  }
  return false;
};

const fetchData = useCallback(async () => {
  if (!projectId) return;
  setLoading(true);
  setError("");

  const controller = new AbortController();

  try {
    const projectRes = await api.get(`/projects/${projectId}`, { signal: controller.signal });
    setProject(projectRes.data);

    const params = currentFolderId ? `?parent_id=${currentFolderId}` : "";
    console.log("Fetching documents with params:", params, "currentFolderId:", currentFolderId);
    const itemsRes = await api.get(`/projects/${projectId}/documents${params}`, { signal: controller.signal });
    const allItems = itemsRes.data || [];
    console.log("Fetched items:", allItems.length);
    setItems(allItems);
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    console.error("Fetch failed:", err);
    const msg = err.response?.data?.detail || err.message || "Failed to load";
    setError(msg);
    if (err.response?.status === 401) {
      logout();
      navigate("/login");
    }
  } finally {
    setLoading(false);
  }

  return () => controller.abort();
}, [projectId, currentFolderId, logout, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleResize = () => {
      const nowMobile = window.innerWidth < 1024;
      setIsMobile(nowMobile);
      // On mobile → close sidebar by default
      // On desktop → keep it open if it was open, close only if user explicitly closed
      if (nowMobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // run once on mount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCreateItem = async () => {
    if (!projectId || !newItemName.trim()) {
      setError("Name is required");
      return;
    }

    try {
      await api.post(`/projects/${projectId}/documents`, {
        title: newItemName.trim(),
        type: newItemType,
        parent_id: currentFolderId || null,
      });
      setNewItemName("");
      setNewItemType("document");
      setCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create item");
    }
  };

function ErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (hasError) console.error("Error boundary caught render failure");
  }, [hasError]);

  if (hasError) return fallback;

  return children;
}

  const handleUpdateItem = async () => {
    if (!projectId || !editItem || !editItem._id || !editItemName.trim()) {
      setError("Cannot update: missing ID or name");
      return;
    }

    try {
      await api.patch(`/projects/${projectId}/documents/${editItem._id}`, {
        title: editItemName.trim(),
      });
      setEditModalOpen(false);
      setEditItem(null);
      setError("");
      fetchData();
    } catch (err: any) {
      setError("Failed to update item");
    }
  };

  const handleDeleteItem = async () => {
    if (!projectId || !itemToDelete) return;

    try {
      await api.delete(`/projects/${projectId}/documents/${itemToDelete}`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      setError("Failed to delete item");
    }
  };

  const enterFolder = (folderId: string, folderTitle: string) => {
    setFolderStack((prev) => [...prev, folderId]);
    setCurrentFolderId(folderId);
    setFolderPath((prev) => [...prev, { id: folderId, title: folderTitle }]);
  };

  const goToFolder = (index: number) => {
    if (index >= folderPath.length) return;
    const target = folderPath[index];
    setCurrentFolderId(target.id);
    setFolderStack(folderPath.slice(1, index + 1).map((p) => p.id!));
    setFolderPath(folderPath.slice(0, index + 1));
  };

  const goBack = () => {
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    setCurrentFolderId(newStack.length > 0 ? newStack[newStack.length - 1] : null);
    setFolderPath(prev => prev.slice(0, -1));
  };

  const handleEnterFolder = (id: string, title: string) => {
    setCurrentFolderId(id);
    setFolderPath(prev => [...prev, { id, title }]);
    setFolderStack(prev => [...prev, id]);
  };

  const sortedAndFiltered = [...items]
    .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "title-asc") return a.title.localeCompare(b.title);
      if (sortBy === "title-desc") return b.title.localeCompare(a.title);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return (
      <div key={projectId} className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Fixed Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <NavigationBar
          title={project?.name || "Drafts"}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLogout={() => {
            logout();
            navigate("/login");
          }}
          onSettings={() => navigate("/settings")}
        />
      </header>

      {/* Main layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar – fixed (unchanged) */}
        <aside
          className={`
            fixed top-[var(--nav-height,60px)] left-0 z-40
            h-[calc(100vh-var(--nav-height,60px))]
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-80 lg:w-96" : "w-14"}
            bg-[var(--bg-secondary)] border-r border-[var(--border)]
            overflow-hidden
            ${isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"}
          `}
        >
          <ProjectCoverSidebar
            project={project}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
            isMobile={isMobile}
          />
        </aside>
          
        {/* Fixed secondary header (controls bar) – sticks right below primary nav */}
        <div
          className={`
            fixed top-[var(--nav-height,60px)] z-30
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "lg:left-80 lg:xl:left-96" : "lg:left-14"}
            right-0
            bg-[var(--bg-primary)] border-b border-[var(--border)]
            px-4 sm:px-6 lg:px-8 py-5
          `}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              {/* Back button in folder */}
              {folderStack.length > 0 && (
                <button
                  onClick={goBack}
                  className="text-[var(--accent)] hover:text-[var(--accent-dark)] transition"
                  aria-label="Go back"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Hamburger menu – only on mobile */}
              {isMobile && !sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Open sidebar"
                >
                  <Menu size={24} />
                </button>
              )}

              <CreateButton onClick={() => setCreateModalOpen(true)} label="Create" />
            </div>
            
            <div className="flex items-center gap-3">
              <label htmlFor="sort-documents" className="text-sm text-[var(--text-secondary)]">
                Sort by:
              </label>
              <select
                id="sort-documents"
                name="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)] min-w-[160px]"
              >
                <option value="updated-desc">Recently updated</option>
                <option value="title-asc">Title (A–Z)</option>
                <option value="title-desc">Title (Z–A)</option>
              </select>
            </div>
          </div>
        </div>
            
        {/* Main content – now starts below the fixed controls */}
        <main
          className={`
            flex-1 overflow-y-auto relative
            mt-[calc(5rem+1.25rem)] lg:mt-[calc(5rem+1.25rem)] 
            ${isMobile ? "" : ""}
            ${sidebarOpen ? "lg:pl-80 lg:xl:pl-96" : "lg:pl-14"}
            transition-all duration-300 ease-in-out
          `}
        >
          <ErrorBoundary fallback={<div className="p-8 text-red-600">Render error — check console</div>}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => {
              const id = e.active.id as string;
              console.log("Drag start: active.id =", id);
              setActiveId(id);
              const item = items.find(i => i._id === id);
              setActiveTitle(item?.title || "");
            }}
            onDragEnd={(event) => {
              console.log("Drag end: active.id =", event.active.id, "over.id =", event.over?.id);
              setActiveId(null);
              setActiveDocumentTitle("");
              handleDragEnd(event);
            }}
            onDragCancel={() => {
              setActiveId(null);
              setActiveDocumentTitle("");
            }}
          >
            {/* <SortableContext
              items={sortedAndFiltered.map((i) => i._id)}
              strategy={verticalListSortingStrategy}
            > */}

          {/* Overlay for mobile sidebar */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden pointer-events-auto"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <Breadcrumb path={folderPath} onClick={goToFolder} currentFolderId={currentFolderId} />

          {/* Document list – takes full remaining width */}
          <DocumentList
            items={sortedAndFiltered}
            onEnterFolder={handleEnterFolder}
            onNavigateDocument={(id) => navigate(`/editor/${id}`)}
            onEdit={(item) => {
              setEditItem(item);
              setEditItemName(item.title);
              setEditModalOpen(true);
            }}
            onDelete={(id) => {
              setItemToDelete(id);
              setDeleteModalOpen(true);
            }}
            sidebarOpen={sidebarOpen}
          />
          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <div className="
                flex items-center gap-3 px-4 py-2.5 
                bg-[var(--bg-secondary)]/95 backdrop-blur-sm 
                border border-[var(--accent)]/30 rounded-lg 
                shadow-2xl min-w-[180px] max-w-[360px] w-fit
              ">
                <FileText size={28} className="text-[var(--accent)] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)] line-clamp-1">
                  {activeTitle}
                </span>
              </div>
            ) : null}
          </DragOverlay>
            {/* </SortableContext> */}
          </DndContext>
          </ErrorBoundary>
        </main>
      </div>

      {/* Error message */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow-lg z-50">
          {error}
        </div>
      )}

      {/* Modals */}
      <CreateItemModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateItem}
        name={newItemName}
        onNameChange={setNewItemName}
        type={newItemType}
        onTypeChange={setNewItemType}
      />

      {editModalOpen && editItem && (
        <EditItemModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditItem(null);   
          }}
          onSave={handleUpdateItem}
          name={editItemName}
          onNameChange={setEditItemName}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteItem}
      />
    </div>
  );
}