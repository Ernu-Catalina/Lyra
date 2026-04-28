// src/pages/Documents.tsx
import { useEffect, useState, useCallback, MouseEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import NavigationBar from "../../common_components/NavigationBar";
import ProjectCoverSidebar from "../documents/components/ProjectCoverSidebar";
import DocumentList from "../documents/components/DocumentList";
import EditItemModal from "../../common_components/EditItemModal";
import CreateItemModal from "../../common_components/CreateItemModal";
import DeleteConfirmationModal from "../../common_components/DeleteConfirmationModal";
import MoveConflictModal from "../../common_components/MoveConflictModal";
import { ChevronLeft, Menu, FileText } from "lucide-react";
import CreateButton from "../../common_components/CreateButton";
import { Project, Item } from "../../types/document";
import Breadcrumb from "./components/Breadcrumb";

// ────────────────────────────────────────────────
// TYPES & INTERFACES (already defined elsewhere, just referenced)
// ────────────────────────────────────────────────

export default function Documents() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ────────────────────────────────────────────────
  // CORE STATE
  // ────────────────────────────────────────────────
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);           // current folder items

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "updated-desc" | "title-asc" | "title-desc" | "wordcount-desc" | "wordcount-asc"
  >("updated-desc");

  // Sidebar & mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<string[]>([]);
  const [folderPath, setFolderPath] = useState<Array<{ id: string | null; title: string }>>([
    { id: null, title: "Project Root" },
  ]);

  // Clipboard & context menu
  const [clipboard, setClipboard] = useState<
    Array<{ id: string; type: "document" | "folder"; title: string; action: "copy" | "cut" }>
  >([]);
  const [contextMenu, setContextMenu] = useState<
    { x: number; y: number; type: "root" | "item"; item?: Item | null } | null
  >(null);
  const [toast, setToast] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"document" | "folder">("document");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editItemName, setEditItemName] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [moveConflict, setMoveConflict] = useState<{
    active: Item;
    existing: Item;
    originalDocument: any;
    newParent: string | null;
    targetItems: Item[];
  } | null>(null);

  const [pasteConflict, setPasteConflict] = useState<{
    clipboardItem: { id: string; type: "document" | "folder"; title: string; action: "copy" | "cut" };
    existingItem: Item;
    targetFolderId: string | null;
    suggestedName: string;
    onResolve: () => void;
  } | null>(null);

  // ────────────────────────────────────────────────
  // HOOKS & SENSORS
  // ────────────────────────────────────────────────

  // Update folder path when project loads
  useEffect(() => {
    if (project) {
      setFolderPath([{ id: null, title: project.name }, ...folderPath.slice(1)]);
    }
  }, [project]);

  // Mobile sidebar handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

// ────────────────────────────────────────────────
// DATA FETCHING - FIXED & CLEAN
// ────────────────────────────────────────────────
const fetchData = useCallback(async () => {
  if (!projectId) return;

  setLoading(true);
  setError("");

  const controller = new AbortController();

  try {
    // 1. Fetch project details
    const projectRes = await api.get(`/projects/${projectId}`, { 
      signal: controller.signal 
    });
    setProject(projectRes.data);

    // 2. Fetch documents/items - clean relative path only
    const params = currentFolderId ? `?parent_id=${currentFolderId}` : "";
    const itemsRes = await api.get(`/projects/${projectId}/documents${params}`, { 
      signal: controller.signal 
    });

    const allItems = itemsRes.data || [];
    setItems(allItems);

  } catch (err: any) {
    if (err.name === "AbortError") return;

    console.error("Fetch failed:", err);

    const msg = err.response?.data?.detail || err.message || "Failed to load project";
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

  // ────────────────────────────────────────────────
  // CLIPBOARD & CONTEXT MENU HANDLERS
  // ────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleCopy = (item: Item) => {
    setClipboard((prev) => [...prev, { id: item._id, type: item.type, title: item.title, action: "copy" }]);
    showToast("Copied to clipboard");
  };

  const handleCut = (item: Item) => {
    setClipboard((prev) => [...prev, { id: item._id, type: item.type, title: item.title, action: "cut" }]);
    showToast("Cut to clipboard");
  };

  const generateCopiedName = useCallback((original: string, existingNames: string[]): string => {
    const base = original;
    let candidate = `${base} (copy)`;
    let counter = 2;
    const lower = (s: string) => s.toLowerCase();
    const existLower = existingNames.map(lower);
    while (existLower.includes(candidate.toLowerCase())) {
      candidate = `${base} (${counter})`;
      counter += 1;
    }
    return candidate;
  }, []);

  const handlePaste = async (targetFolderId: string | null) => {
  if (clipboard.length === 0) return;

  // We'll process clipboard items one by one, pausing on conflict
  const remainingClipboard = [...clipboard];
  setClipboard([]); // clear immediately to prevent duplicate pastes

  let pastedCount = 0;

  const processNext = async () => {
    if (remainingClipboard.length === 0) {
      if (pastedCount > 0) {
        showToast(`Pasted ${pastedCount} item${pastedCount > 1 ? "s" : ""}`);
      }
      fetchData();
      return;
    }

    const clip = remainingClipboard.shift()!;

    let existing: Item[] = [];
    try {
      const params = targetFolderId ? `?parent_id=${targetFolderId}` : "";
      const res = await api.get(`/projects/${projectId}/documents${params}`);
      existing = res.data || [];
    } catch (e) {
      console.error("[PASTE FETCH ERROR]", e);
      setError("Could not check for conflicts");
      processNext(); // continue anyway
      return;
    }

    let finalName = clip.title;
    const conflict = existing.find((i) => i.title.toLowerCase() === finalName.toLowerCase());

    if (conflict) {
      // Conflict → pause and show modal
      const suggested = generateCopiedName(clip.title, existing.map((i) => i.title));
      setPasteConflict({
        clipboardItem: clip,
        existingItem: conflict,
        targetFolderId,
        suggestedName: suggested,
        onResolve: processNext, // ← key: resume after modal choice
      });
      return;
    }

    // No conflict → paste immediately
    let origData: any = null;
    try {
      const r = await api.get(`/projects/${projectId}/documents/${clip.id}`);
      origData = r.data;
    } catch (err) {
      console.error(err);
    }

    const payload: any = { title: finalName, type: clip.type, parent_id: targetFolderId };
    if (origData?.chapters) payload.chapters = origData.chapters;

    try {
      await api.post(`/projects/${projectId}/documents`, payload);
      if (clip.action === "cut") {
        await api.delete(`/projects/${projectId}/documents/${clip.id}`);
      }
      pastedCount++;
      processNext(); // continue to next item
    } catch (err) {
      console.error("[PASTE ERROR]", err);
      setError("Paste failed for one item");
      processNext(); // continue anyway
    }
  };

  // Start processing
  processNext();
};

  const openContextMenu = (e: MouseEvent, item?: Item | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: item ? "item" : "root", item: item ?? null });
  };

  // ────────────────────────────────────────────────
  // FOLDER NAVIGATION HELPERS
  // ────────────────────────────────────────────────
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
    setFolderPath((prev) => prev.slice(0, -1));
  };

  // ────────────────────────────────────────────────
  // ITEM ACTIONS
  // ────────────────────────────────────────────────
  const handleCreateItem = async () => {
    if (!projectId || !newItemName.trim()) {
      setError("Name is required");
      return;
    }

    const nameLower = newItemName.trim().toLowerCase();
    const dup = items.find(
      (i) => i.title.toLowerCase() === nameLower && i.parent_id === currentFolderId
    );
    if (dup) {
      setError("An item with that name already exists in this folder");
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

    const nameLower = editItemName.trim().toLowerCase();
    const dup = items.find(
      (i) => i.title.toLowerCase() === nameLower && i.parent_id === editItem.parent_id && i._id !== editItem._id
    );
    if (dup) {
      setError("An item with that name already exists in this folder");
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
      const msg = err.response?.data?.detail || "Failed to update item";
      setError(msg);
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

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────
  const sortedAndFiltered = [...items]
    .filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Folders always sort alphabetically
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }

      switch (sortBy) {
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "wordcount-desc":
          return (b.word_count ?? 0) - (a.word_count ?? 0);
        case "wordcount-asc":
          return (a.word_count ?? 0) - (b.word_count ?? 0);
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Navigation Bar */}
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

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            fixed top-[var(--nav-height,60px)] left-0 z-40
            h-[calc(100vh-var(--nav-height,60px))]
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-72 sm:w-80 lg:w-80 xl:w-96" 
          : "w-14"}
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

        {/* Controls bar */}
        <div
          className={`
            fixed top-[var(--nav-height,60px)] z-30
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "lg:left-80 lg:xl:left-96" : "lg:left-14"}
            right-0 left-0 sm:left-auto
            bg-[var(--bg-primary)] border-b border-[var(--border)]
            px-4 sm:px-6 lg:px-8 py-5
          `}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-screen-xl mx-auto">
            {/* Left: Create*/}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <CreateButton onClick={() => setCreateModalOpen(true)} label="Create" />
            </div>

            {/* Right: Sort */}
            <div className="flex items-center gap-3">
              <label htmlFor="sort-documents" className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort-documents"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="
                  px-3 py-1.5 pr-10
                  bg-[var(--bg-secondary)] border border-[var(--border)]
                  rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]
                  outline-none min-w-[180px]
                "
              >
                <option value="updated-desc">Recently updated</option>
                <option value="wordcount-desc">Word count (high to low)</option>
                <option value="wordcount-asc">Word count (low to high)</option>
                <option value="title-asc">Title (A–Z)</option>
                <option value="title-desc">Title (Z–A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e, null);
          }}
          className={`
            flex-1 overflow-y-auto relative
            mt-[calc(5rem+1.25rem)] lg:mt-[calc(5rem+1.25rem)]
            ${sidebarOpen ? "lg:pl-80 lg:xl:pl-96" : "lg:pl-14"}
            transition-all duration-300 ease-in-out
          `}
        >
          {loading && <div className="p-8 text-center text-xl">Loading project...</div>}
          {error && (
            <div className="p-8 bg-red-100 border border-red-400 text-red-700 rounded m-4">
              <h2 className="text-2xl font-bold mb-4">Error loading project</h2>
              <p className="text-lg mb-4">{error}</p>
              <button
                onClick={() => { setError(""); fetchData(); }}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}

              {isMobile && sidebarOpen && (
                <div
                  className="fixed inset-0 bg-black/50 z-30 lg:hidden pointer-events-auto"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              <Breadcrumb path={folderPath} onClick={goToFolder} currentFolderId={currentFolderId} />

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
                sidebarOpen={sidebarOpen}
                currentFolderId={currentFolderId}
                onContextMenu={openContextMenu}
              />
        </main>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg py-1 text-[var(--text-primary)] min-w-[160px]"
        >
          {contextMenu.type === "item" && contextMenu.item && (
            <>
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]"
                onClick={() => { handleCopy(contextMenu.item!); setContextMenu(null); }}
              >
                Copy
              </button>
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]"
                onClick={() => { handleCut(contextMenu.item!); setContextMenu(null); }}
              >
                Cut
              </button>

              {contextMenu.item.type === "folder" && (
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)] disabled:opacity-50"
                  disabled={clipboard.length === 0}
                  onClick={() => { handlePaste(contextMenu.item!._id); setContextMenu(null); }}
                >
                  Paste into folder
                </button>
              )}

              <button
                className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]"
                onClick={() => {
                  setEditItem(contextMenu.item!);
                  setEditItemName(contextMenu.item!.title);
                  setEditModalOpen(true);
                  setContextMenu(null);
                }}
              >
                Edit
              </button>

              <button
                className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]"
                onClick={() => {
                  setItemToDelete(contextMenu.item!._id);
                  setDeleteModalOpen(true);
                  setContextMenu(null);
                }}
              >
                Delete
              </button>
            </>
          )}

          {contextMenu.type === "root" && (
            <>
              <button
                className="block w-full text-left px-4 py-2 text-[var(--text-secondary)] disabled:opacity-50"
                disabled
              >
                Copy
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-[var(--text-secondary)] disabled:opacity-50"
                disabled
              >
                Cut
              </button>
              <hr className="my-1 border-[var(--border)]" />
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)] disabled:opacity-50"
                disabled={clipboard.length === 0}
                onClick={() => {
                  handlePaste(currentFolderId);
                  setContextMenu(null);
                }}
              >
                Paste
              </button>
            </>
          )}
        </div>
      )}

      {/* Toast & Error */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow-lg z-50">
          {error}
        </div>
      )}
      {toast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded shadow-lg z-50">
          {toast}
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

      {pasteConflict && (
        <MoveConflictModal
          isOpen={!!pasteConflict}
          conflictingName={pasteConflict.existingItem.title}
          suggestedName={pasteConflict.suggestedName}
          onCancel={() => {
            setPasteConflict(null);
            pasteConflict.onResolve();
          }}
          onOverwrite={async () => {
            try {
              await api.delete(`/projects/${projectId}/documents/${pasteConflict.existingItem._id}`);
            
              const clip = pasteConflict.clipboardItem;
              const payload: any = {
                title: clip.title,
                type: clip.type,
                parent_id: pasteConflict.targetFolderId,
              };
            
              let origData: any = null;
              try {
                const r = await api.get(`/projects/${projectId}/documents/${clip.id}`);
                origData = r.data;
                if (origData?.chapters) payload.chapters = origData.chapters;
              } catch (err) {
                console.error("Could not fetch original data:", err);
              }
            
              await api.post(`/projects/${projectId}/documents`, payload);
            
              if (clip.action === "cut") {
                await api.delete(`/projects/${projectId}/documents/${clip.id}`);
              }
            
              showToast("Pasted with overwrite");
            } catch (err) {
              console.error("[PASTE OVERWRITE ERROR]", err);
              setError("Paste overwrite failed");
            } finally {
              setPasteConflict(null);
              pasteConflict.onResolve();
            }
          }}
          onRename={async () => {
            try {
              const clip = pasteConflict.clipboardItem;
              const finalName = pasteConflict.suggestedName;
              const payload: any = {
                title: finalName,
                type: clip.type,
                parent_id: pasteConflict.targetFolderId,
              };
            
              let origData: any = null;
              try {
                const r = await api.get(`/projects/${projectId}/documents/${clip.id}`);
                origData = r.data;
                if (origData?.chapters) payload.chapters = origData.chapters;
              } catch (err) {
                console.error("Could not fetch original data:", err);
              }
            
              await api.post(`/projects/${projectId}/documents`, payload);
            
              if (clip.action === "cut") {
                await api.delete(`/projects/${projectId}/documents/${clip.id}`);
              }
            
              showToast("Pasted with new name");
            } catch (err) {
              console.error("[PASTE RENAME ERROR]", err);
              setError("Paste rename failed");
            } finally {
              setPasteConflict(null);
              pasteConflict.onResolve();
            }
          }}
        />
      )}
    </div>
  );
}