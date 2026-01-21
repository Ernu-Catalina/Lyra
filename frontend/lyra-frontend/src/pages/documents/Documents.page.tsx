// src/pages/Documents.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import NavigationBar from "../../common_components/NavigationBar";
import ProjectCoverSidebar from "../documents/components/ProjectCoverSidebar";
import DocumentList from "../documents/components/DocumentList";
import CreateItemModal from "../documents/components/CreateItemModal";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");

    try {
      const projectRes = await api.get(`/projects/${projectId}`);
      setProject(projectRes.data);

      const params = currentFolderId ? `?parent_id=${currentFolderId}` : "";
      const itemsRes = await api.get(`/projects/${projectId}/documents${params}`);
      setItems(itemsRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        setError("Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, currentFolderId, logout, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  setFolderStack(prev => [...prev, folderId]);
  setCurrentFolderId(folderId);
};

  const goBack = () => {
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    setCurrentFolderId(newStack.length > 0 ? newStack[newStack.length - 1] : null);
  };

  const sortedAndFiltered = [...items]
    .filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "title-asc") return a.title.localeCompare(b.title);
      if (sortBy === "title-desc") return b.title.localeCompare(a.title);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

return (
  <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    {/* Fixed Navigation Bar */}
    <header className="sticky top-0 z-50 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <NavigationBar
        title={project?.name || "Drafts"}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={() => { logout(); navigate("/login"); }}
        onSettings={() => navigate("/settings")}
      />
    </header>

    {error && (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
        {error}
      </div>
    )}

    {/* Fixed Sidebar + Scrollable Content */}
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar – fixed, full height, no internal scroll */}
      <ProjectCoverSidebar
        project={project}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
      />
      <main className="flex-1 overflow-y-auto">
        {/* Header controls */}
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              {folderStack.length > 0 && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <CreateButton
                onClick={() => setCreateModalOpen(true)}
                label="Create Draft"
              />
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

        {/* Folder + Document List */}
        <DocumentList
          items={sortedAndFiltered}
          onEnterFolder={enterFolder}
          onNavigateDocument={(id) => navigate(`/projects/${projectId}/documents/${id}`)}
          onEdit={(item) => {
            setEditItem(item);
            setEditItemName(item.title);
            setEditModalOpen(true);
          }}
          onDelete={(id) => {
            setItemToDelete(id);
            setDeleteModalOpen(true);
          }}
        />
      </main>
    </div>

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
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--bg-secondary)] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[var(--border)]">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Edit Item</h2>
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-full p-1"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="edit-item-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Name
              </label>
              <input
                id="edit-item-name"
                type="text"
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleUpdateItem}
                disabled={!editItemName.trim()}
                className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 disabled:opacity-50 transition font-medium"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-2.5 bg-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border)]/80 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <DeleteConfirmationModal
      isOpen={deleteModalOpen}
      onClose={() => {
        setDeleteModalOpen(false);
        setItemToDelete(null);
      }}
      onConfirm={handleDeleteItem}
      title={itemToDelete?.type === "folder" ? "Delete Folder?" : "Delete Document?"}
      message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
    />
  </div>
);
}