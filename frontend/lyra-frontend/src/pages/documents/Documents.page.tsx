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
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { X } from "lucide-react";
import CreateButton from "../../common_components/CreateButton";
import { Project } from "../../types/document";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated-desc" | "title-asc" | "title-desc">("updated-desc");

  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop default: open
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<string[]>([]);

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

const fetchData = useCallback(async () => {
  if (!projectId) return;
  setLoading(true);
  setError("");

  const controller = new AbortController();

  try {
    const projectRes = await api.get(`/projects/${projectId}`, { signal: controller.signal });
    setProject(projectRes.data);

    const params = currentFolderId ? `?parent_id=${currentFolderId}` : "";
    const itemsRes = await api.get(`/projects/${projectId}/documents${params}`, { signal: controller.signal });
    setItems(itemsRes.data || []);
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

  const enterFolder = (folderId: string) => {
    setFolderStack((prev) => [...prev, folderId]);
    setCurrentFolderId(folderId);
  };

  const goBack = () => {
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    setCurrentFolderId(newStack.length > 0 ? newStack[newStack.length - 1] : null);
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
            fixed top-[var(--nav-height,64px)] left-0 z-40
            h-[calc(100vh-var(--nav-height,64px))]
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
            mt-[calc(5rem+1.25rem)] lg:mt-[calc(5rem+1.25rem)]   /* ≈ py-5 + mb-6 ≈ 80px; adjust if needed */
            ${sidebarOpen ? "lg:pl-80 lg:xl:pl-96" : "lg:pl-14"}
            transition-all duration-300 ease-in-out
          `}
        >
          {/* Overlay for mobile sidebar */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden pointer-events-auto"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Document list – takes full remaining width */}
          <DocumentList
            items={sortedAndFiltered}
            onEnterFolder={enterFolder}
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