// src/pages/Documents.tsx
import { useEffect, useState, useCallback, MouseEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import NavigationBar from "../../common_components/NavigationBar";
import ProjectCoverSidebar from "../documents/components/ProjectCoverSidebar";
import DocumentList from "../documents/components/DocumentList";
import EditItemModal from "../documents/components/EditItemModal";
import CreateItemModal from "../documents/components/CreateItemModal";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal";
import MoveConflictModal from "../documents/components/MoveConflictModal";
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
  console.log("Documents page mounted, projectId:", projectId);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
  "updated-desc" | "title-asc" | "title-desc" | "wordcount-desc" | "wordcount-asc"
>("updated-desc");

  // clipboard for copy/cut operations
  const [clipboard, setClipboard] = useState<Array<{id: string; type: "document" | "folder"; title: string; action: "copy" | "cut"}>>([]);
  const [contextMenu, setContextMenu] = useState<
    | { x: number; y: number; type: "root" | "item"; item?: Item | null }
    | null
  >(null);
  const [toast, setToast] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop default: open
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<string[]>([]);
  const [folderPath, setFolderPath] = useState<Array<{ id: string | null; title: string }>>([
  { id: null, title: project?.name || "Project Root" },
]);

  // state for move conflicts during drag & drop
  const [moveConflict, setMoveConflict] = useState<{
    active: Item;
    existing: Item;
    originalDocument: any; // full document data for rollback
    newParent: string | null;
    targetItems: Item[];
  } | null>(null);

  const [pasteConflict, setPasteConflict] = useState<{
    clipboardItem: { id: string; type: "document" | "folder"; title: string; action: "copy" | "cut" };
    existingItem: Item;
    targetFolderId: string | null;
    suggestedName: string;
  } | null>(null);

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

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;

  const activeId = active.id as string;
  const overId = over.id as string;

  const item = items.find(i => i._id === activeId);
  if (!item || item.type !== "document") return;

  const newParent = overId === "root" ? null : overId;
  if (item.parent_id === newParent) return; // no movement

  // fetch target folder contents to detect duplicates
  let targetItems: Item[] = [];
  try {
    const params = newParent ? `?parent_id=${newParent}` : "";
    const res = await api.get(`/projects/${projectId}/documents${params}`);
    targetItems = res.data || [];
  } catch (fetchErr) {
    console.error("[FETCH TARGET ITEMS ERROR]", fetchErr);
    setError("Cannot load target folder contents");
    return;
  }

  const conflict = targetItems.find(i => i.title.toLowerCase() === item.title.toLowerCase());
  if (conflict) {
    // fetch full document details of the conflicting item for proper rollback
    try {
      const fullDocRes = await api.get(`/projects/${projectId}/documents/${conflict._id}`);
      const originalDocument = fullDocRes.data;
      setMoveConflict({ active: item, existing: conflict, originalDocument, newParent, targetItems });
    } catch (docFetchErr) {
      console.error("[FETCH CONFLICT DOCUMENT ERROR]", docFetchErr);
      setMoveConflict({ active: item, existing: conflict, originalDocument: conflict, newParent, targetItems });
    }
    return;
  }

  // proceed with move
  setItems(prev => prev.filter(i => i._id !== activeId));
  try {
    await api.patch(`/projects/${projectId}/documents/${activeId}`, {
      parent_id: newParent,
    });
    await fetchData();
  } catch (err: any) {
    console.error("[PATCH ERROR]", err.response?.data || err.message);
    const msg = err.response?.data?.detail || "Move failed – check console";
    setError(msg);
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

// compute a non-conflicting copy name given the existing titles
function generateCopiedName(original: string, existingNames: string[]): string {
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
}

// helper to show toast messages
const showToast = (msg: string) => {
  setToast(msg);
  setTimeout(() => setToast(""), 3000);
};

// clipboard operations
const handleCopy = (item: Item) => {
  setClipboard((prev) => [...prev, { id: item._id, type: item.type, title: item.title, action: "copy" }]);
  showToast("Copied to clipboard");
};

const handleCut = (item: Item) => {
  setClipboard((prev) => [...prev, { id: item._id, type: item.type, title: item.title, action: "cut" }]);
  showToast("Cut to clipboard");
};

// paste into target folder (null = project root)
const handlePaste = async (targetFolderId: string | null) => {
  if (clipboard.length === 0) return;
  // load existing items in target to detect conflicts
  let existing: Item[] = [];
  try {
    const params = targetFolderId ? `?parent_id=${targetFolderId}` : "";
    const res = await api.get(`/projects/${projectId}/documents${params}`);
    existing = res.data || [];
  } catch (e) {
    console.error("[PASTE FETCH ERROR]", e);
  }
  let pastedCount = 0;
  for (const clip of clipboard) {
    let finalName = clip.title;
    const conflict = existing.find((i) => i.title.toLowerCase() === finalName.toLowerCase());
    if (conflict) {
      const suggested = generateCopiedName(clip.title, existing.map(i => i.title));
      setPasteConflict({
        clipboardItem: clip,
        existingItem: conflict,
        targetFolderId,
        suggestedName: suggested,
      });
      return; // stop current paste loop — resume after modal choice
    }
    let origData: any = null;
    try {
      const r = await api.get(`/projects/${projectId}/documents/${clip.id}`);
      origData = r.data;
    } catch (err) {
      console.error(err);
    }
    const payload: any = { title: finalName, type: clip.type, parent_id: targetFolderId };
    if (origData) {
      if (origData.chapters) payload.chapters = origData.chapters;
    }
    try {
      await api.post(`/projects/${projectId}/documents`, payload);
      if (clip.action === "cut") {
        await api.delete(`/projects/${projectId}/documents/${clip.id}`);
      }
      pastedCount++;
    } catch (err) {
      console.error("[PASTE ERROR]", err);
      setError("Paste failed");
    }
  }
  if (pastedCount > 0) {
    showToast(`Pasted ${pastedCount} item${pastedCount > 1 ? "s" : ""}`);
  }
  setClipboard([]);
  fetchData();
};

// open context menu
const openContextMenu = (e: MouseEvent, item?: Item | null) => {
  e.preventDefault();
  e.stopPropagation();
  setContextMenu({ x: e.clientX, y: e.clientY, type: item ? "item" : "root", item: item ?? null });
};

// close on click outside
useEffect(() => {
  const handleClick = () => setContextMenu(null);
  window.addEventListener("click", handleClick);
  return () => window.removeEventListener("click", handleClick);
}, []);

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
    console.log("Documents fetch result:", {
  project: projectRes.data,
  itemsCount: itemsRes.data?.length || 0,
  items: itemsRes.data
});
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
    try {
      fetchData();
    } catch (e) {
      console.error("fetchData effect error", e);
    }
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

    // local duplicate check
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

    // local duplicate check (same parent)
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

  // conflict resolution helpers
  const handleCancelMove = () => {
    // simply clear conflict state; items list is managed by handleDragEnd/fetchData
    setMoveConflict(null);
  };

  const handleOverwriteMove = async () => {
    if (!projectId || !moveConflict) return;
    try {
      await api.delete(`/projects/${projectId}/documents/${moveConflict.existing._id}`);
      try {
        await api.patch(`/projects/${projectId}/documents/${moveConflict.active._id}`, {
          parent_id: moveConflict.newParent,
        });
        setMoveConflict(null);
        fetchData();
      } catch (patchErr: any) {
        console.error("[PATCH ERROR AFTER DELETE]", patchErr);
        // attempt rollback: restore the deleted document with its full original content
        try {
          const originalDoc = moveConflict.originalDocument;
          let restored = false;
          
          // try restore endpoint first (if backend supports it)
          try {
            await api.post(
              `/projects/${projectId}/documents/${moveConflict.existing._id}/restore`,
              {}
            );
            restored = true;
          } catch (restoreErr: any) {
            // restore endpoint not available, fall back to recreate via POST
            if (restoreErr.response?.status !== 404) {
              throw restoreErr;
            }
          }
          
          // if restore endpoint not available, recreate with POST
          if (!restored) {
            const restorePayload: any = {
              title: originalDoc.title,
              type: originalDoc.type,
              parent_id: originalDoc.parent_id || null,
            };
            // include chapters if document type is not folder
            if (originalDoc.type !== "folder" && originalDoc.chapters) {
              restorePayload.chapters = originalDoc.chapters;
            }
            await api.post(`/projects/${projectId}/documents`, restorePayload);
          }
          
          setError("Failed to move item – original was restored, please try again.");
          fetchData();
        } catch (rbErr: any) {
          console.error("[ROLLBACK ERROR]", rbErr);
          const msg =
            "Item was deleted but move failed; original could not be restored. Please contact support or retry.";
          setError(msg);
          handleCancelMove();
          return;
        }
        handleCancelMove();
      }
    } catch (err: any) {
      console.error("[OVERWRITE ERROR]", err);
      const msg = err.response?.data?.detail || "Failed to overwrite item";
      setError(msg);
      handleCancelMove();
    }
  };

  const handleRenameMove = async () => {
    if (!projectId || !moveConflict) return;
    const existingNames = moveConflict.targetItems.map(i => i.title);
    const newName = generateCopiedName(moveConflict.active.title, existingNames);
    try {
      await api.patch(`/projects/${projectId}/documents/${moveConflict.active._id}`, {
        parent_id: moveConflict.newParent,
        title: newName,
      });
      setMoveConflict(null);
      fetchData();
    } catch (err: any) {
      console.error("[RENAME MOVE ERROR]", err);
      const msg = err.response?.data?.detail || "Failed to move with rename";
      setError(msg);
      handleCancelMove();
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
      // Folders always sort alphabetically (stable and intuitive)
      if (a.type !== b.type) {
        if (a.type === "folder") return -1;
        if (b.type === "folder") return 1;
      }
    
      // Documents (or folders if same type) sort based on selected option
      switch (sortBy) {
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "wordcount-desc":
          // Use word_count || 0 for documents; folders get 0 or Infinity depending on preference
          const wordA = a.word_count ?? 0;
          const wordB = b.word_count ?? 0;
          return wordB - wordA; // descending (highest first)
        case "wordcount-asc":
          const wordAscA = a.word_count ?? 0;
          const wordAscB = b.word_count ?? 0;
          return wordAscA - wordAscB; // ascending (lowest first)
        default: // "updated-desc"
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  return (
    <main className="...">
  {loading && <div className="p-8 text-center text-xl">Loading project...</div>}
  {error && (
    <div className="p-8 bg-red-100 border border-red-400 text-red-700 rounded m-4">
      <h2 className="text-2xl font-bold mb-4">Error loading project</h2>
      <p className="text-lg mb-4">{error}</p>
      <pre className="bg-red-50 p-4 rounded overflow-auto max-h-60">{error}</pre>
      <button 
        onClick={() => { setError(""); fetchData(); }}
        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  )}
  {!loading && !error && (
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
            
            <div className="flex items-center gap-2">
              <label htmlFor="sort-documents" className="text-sm text-[var(--text-secondary)]">
                Sort by:
              </label>
              <select
                id="sort-documents"
                name="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none min-w-[180px] appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px_12px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMiA0TDYgOEwxMCA0IiBzdHJva2U9IiM2YjcyODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] cursor-pointer"
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
            
        {/* Main content – now starts below the fixed controls */}
        <main
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e, null);
          }}
          className={`
            flex-1 overflow-y-auto relative
            mt-[calc(5rem+1.25rem)] lg:mt-[calc(5rem+1.25rem)] 
            ${isMobile ? "" : ""}
            ${sidebarOpen ? "lg:pl-80 lg:xl:pl-96" : "lg:pl-14"}
            transition-all duration-300 ease-in-out
          `}
        >
          <ErrorBoundary fallback={<div className="p-8 text-[var(--accent)]">Render error — check console</div>}>
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
            currentFolderId={currentFolderId}
            onContextMenu={openContextMenu}
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

      {/* context menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg py-1 text-[var(--text-primary)]"
        >
          {contextMenu.type === "item" && contextMenu.item && (
            <>
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]"
                onClick={() => {
                  handleCopy(contextMenu.item!);
                  setContextMenu(null);
                }}
              >
                Copy
              </button>
              <button
                className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]"
                onClick={() => {
                  handleCut(contextMenu.item!);
                  setContextMenu(null);
                }}
              >
                Cut
              </button>
              {contextMenu.item.type === "folder" && (
                <>
                  <hr className="my-1 border-[var(--border)]" />
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)] disabled:opacity-50"
                    disabled={clipboard.length === 0}
                    onClick={() => {
                      handlePaste(contextMenu.item!._id);
                      setContextMenu(null);
                    }}
                  >
                    Paste into folder
                  </button>
                </>
              )}
              <hr className="my-1 border-[var(--border)]" />
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
                  const target = currentFolderId;
                  if (clipboard.length > 0) handlePaste(target);
                  setContextMenu(null);
                }}
              >
                Paste
              </button>
            </>
          )}
        </div>
      )}
      {/* Error message */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--accent)] text-[var(--accent)] px-6 py-3 rounded shadow-lg z-50">
          {error}
        </div>
      )}
      {toast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--accent)] text-[var(--accent)] px-6 py-3 rounded shadow-lg z-50">
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

      {moveConflict && (
        <MoveConflictModal
          isOpen={!!moveConflict}
          conflictingName={moveConflict.existing.title}
          suggestedName={generateCopiedName(moveConflict.active.title, moveConflict.targetItems.map(i => i.title))}
          onCancel={handleCancelMove}
          onOverwrite={handleOverwriteMove}
          onRename={handleRenameMove}
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
            // Optionally resume paste or abort
          }}
          onOverwrite={async () => {
            try {
              await api.delete(`/projects/${projectId}/documents/${pasteConflict.existingItem._id}`);
              const clip = pasteConflict.clipboardItem;
              const payload = { title: clip.title, type: clip.type, parent_id: pasteConflict.targetFolderId };
              await api.post(`/projects/${projectId}/documents`, payload);
              if (clip.action === "cut") {
                await api.delete(`/projects/${projectId}/documents/${clip.id}`);
              }
              showToast("Pasted with overwrite");
            } catch (err) {
              setError("Paste overwrite failed");
            } finally {
              setPasteConflict(null);
              fetchData();
            }
          }}
          onRename={async () => {
            try {
              const clip = pasteConflict.clipboardItem;
              const finalName = pasteConflict.suggestedName;
              const payload = { title: finalName, type: clip.type, parent_id: pasteConflict.targetFolderId };
              await api.post(`/projects/${projectId}/documents`, payload);
              if (clip.action === "cut") {
                await api.delete(`/projects/${projectId}/documents/${clip.id}`);
              }
              showToast("Pasted with new name");
            } catch (err) {
              setError("Paste rename failed");
            } finally {
              setPasteConflict(null);
              fetchData();
            }
          }}
        />
      )}
    </div> )}
</main>
  );
}