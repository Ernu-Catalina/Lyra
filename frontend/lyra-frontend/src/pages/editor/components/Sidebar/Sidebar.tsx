// src/components/Sidebar/Sidebar.tsx
import { SidebarHeader } from "./SidebarHeader";
import ChapterBlock from "./ChapterBlock";
import type { Chapter, Scene, DocumentOutline } from "../../../../types/document";
import { useState, useEffect } from "react";
import EditItemModal from "../../../../common_components/EditItemModal";
import DeleteConfirmationModal from "../../../../common_components/DeleteConfirmationModal";
import api from "../../../../api/client";

interface SidebarProps {
  title: string;
  chapters: Chapter[];
  activeSceneId: string | null;
  activeChapterId: string | null;
  openChapterIds: Set<string>;
  onToggleChapter: (chapterId: string) => void;
  onSceneClick: (chapterId: string, sceneId: string) => void;
  onAddChapter: () => void;
  onAddScene: (chapterId: string) => void;
  onChapterClick: (chapterId: string) => void;
  onDocumentClick: () => void;
  setOutline: React.Dispatch<React.SetStateAction<DocumentOutline | undefined>>;
  projectId: string;
  documentId: string;
  reloadOutline: () => void;
}

export default function Sidebar({
  title,
  chapters,
  activeSceneId,
  activeChapterId,
  openChapterIds,
  onToggleChapter,
  onSceneClick,
  onAddChapter,
  onAddScene,
  onChapterClick,
  onDocumentClick,
  setOutline,
  projectId,
  documentId,
  reloadOutline,
}: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "chapter" | "scene";
    chapterId: string;
    sceneId?: string;
  } | null>(null);

  const [clipboard, setClipboard] = useState<
    | { type: "chapter"; chapter: Chapter; action: "copy" | "cut" }
    | { type: "scene"; scene: Scene; chapterId: string; action: "copy" | "cut" }
    | null
  >(null);

  // Modals
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<{ id: string; type: "chapter" | "scene"; title: string; chapterId?: string } | null>(null);
  const [renameName, setRenameName] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: "chapter" | "scene"; parentId?: string } | null>(null);

  const showToast = (msg: string) => alert(msg); // replace with real toast later

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);


  // Centralized clipboard setter to avoid stale state
  const setClipboardItem = (action: "copy" | "cut") => {
    if (!contextMenu) return;
    const ch = chapters.find(c => c.id === contextMenu.chapterId)!;
    if (contextMenu.type === "chapter") {
      setClipboard({ type: "chapter", chapter: { ...ch }, action });
    } else {
      const sc = ch.scenes.find(s => s.id === contextMenu.sceneId)!;
      setClipboard({ type: "scene", scene: { ...sc }, chapterId: ch.id, action });
    }
    setContextMenu(null);
  };

  const handleCopy = () => setClipboardItem("copy");
  const handleCut = () => setClipboardItem("cut");

   // PASTE - FIXED (content is now copied + correct position)
  const paste = async (position: "before" | "after") => {
    if (!clipboard || !contextMenu) return;

    // Only allow scene-to-scene or chapter-to-chapter
    if (clipboard.type === "scene" && contextMenu.type !== "scene") {
      setContextMenu(null);
      return;
    }
    if (clipboard.type === "chapter" && contextMenu.type !== "chapter") {

      setContextMenu(null);
      return;
    }

    try {
      let newItem;
      if (clipboard.type === "scene") {
        // Find chapter and scene index
        const chId = contextMenu.chapterId;
        const ch = chapters.find(c => c.id === chId);
        if (!ch) throw new Error("Target chapter not found");
        const scIdx = ch.scenes.findIndex(s => s.id === contextMenu.sceneId);
        const insertIdx = position === "after" ? scIdx + 1 : scIdx;
        // Use /insert endpoint for precise position
        const endpoint = `/projects/${projectId}/documents/${documentId}/chapters/${chId}/scenes/insert`;
        const payload = {
          title: clipboard.scene.title + (clipboard.action === "copy" ? " (copy)" : ""),
          content: clipboard.scene.content || "",
          index: insertIdx
        };
        const res = await api.post(endpoint, payload);
        newItem = res.data;
      } else {
        // Chapter paste: always append, then reorder if needed
        const endpoint = `/projects/${projectId}/documents/${documentId}/chapters`;
        const payload = { title: clipboard.chapter.title + (clipboard.action === "copy" ? " (copy)" : "") };
        const res = await api.post(endpoint, payload);
        newItem = res.data;
        // Optionally: reorder chapters if not appending (not implemented here)
      }

      // If cut → delete original
      if (clipboard.action === "cut") {
        const deleteUrl = clipboard.type === "chapter"
          ? `/projects/${projectId}/documents/${documentId}/chapters/${clipboard.chapter.id}`
          : `/projects/${projectId}/documents/${documentId}/chapters/${clipboard.chapterId}/scenes/${clipboard.scene.id}`;
        await api.delete(deleteUrl);
      }

      reloadOutline();
    } catch (err) {
      console.error("Paste failed:", err);
    }

    setContextMenu(null);
  };

  const handleRename = () => {
    if (!contextMenu) return;
    const ch = chapters.find(c => c.id === contextMenu.chapterId);
    if (!ch) return;
    if (contextMenu.type === "chapter") {
      setItemToRename({ id: ch.id, type: "chapter", title: ch.title, chapterId: ch.id });
      setRenameName(ch.title);
    } else {
      const sc = ch.scenes.find(s => s.id === contextMenu.sceneId);
      if (!sc) return;
      setItemToRename({ id: sc.id, type: "scene", title: sc.title, chapterId: ch.id });
      setRenameName(sc.title);
    }
    setRenameModalOpen(true);
    setContextMenu(null);
  };

  const saveRename = async () => {
    if (!itemToRename || !renameName.trim()) return;

    const chapterId = itemToRename.chapterId || itemToRename.id;
    const sceneId = itemToRename.type === "scene" ? itemToRename.id : undefined;

    const endpoint = itemToRename.type === "chapter"
      ? `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}`
      : `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes/${sceneId}`;

    try {
      await api.patch(endpoint, { title: renameName.trim() });
      reloadOutline();
    } catch (err) {
      console.error(err);
    }

    setRenameModalOpen(false);
    setItemToRename(null);
  };

  const handleDelete = () => {
    if (!contextMenu) return;

    setItemToDelete({
      id: contextMenu.sceneId || contextMenu.chapterId,
      type: contextMenu.type,
      parentId: contextMenu.sceneId ? contextMenu.chapterId : undefined,
    });
    setDeleteModalOpen(true);
    setContextMenu(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const endpoint = itemToDelete.type === "chapter"
      ? `/projects/${projectId}/documents/${documentId}/chapters/${itemToDelete.id}`
      : `/projects/${projectId}/documents/${documentId}/chapters/${itemToDelete.parentId}/scenes/${itemToDelete.id}`;

    try {
      await api.delete(endpoint);
      reloadOutline();
    } catch (err) {
      console.error(err);
      }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const openMenu = (e: React.MouseEvent, type: "chapter" | "scene", chapterId: string, sceneId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, chapterId, sceneId });
  };

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader documentTitle={title} onAddChapter={onAddChapter} onDocumentClick={onDocumentClick} />

      <div className="flex-1 overflow-y-auto px-1 py-1">
        {chapters.map(ch => (
          <ChapterBlock
            key={ch.id}
            chapter={ch}
            isOpen={openChapterIds.has(ch.id)}
            activeSceneId={activeSceneId}
            activeChapterId={activeChapterId}
            onToggle={() => onToggleChapter(ch.id)}
            onAddScene={() => onAddScene(ch.id)}
            onSceneClick={scId => onSceneClick(ch.id, scId)}
            onChapterClick={() => onChapterClick(ch.id)}
            onContextMenuChapter={e => openMenu(e, "chapter", ch.id)}
            onContextMenuScene={(e, scId) => openMenu(e, "scene", ch.id, scId)}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[1000] bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg py-1 min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={handleCopy}>Copy</button>
          <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={handleCut}>Cut</button>

          {clipboard && (
            <>
              {contextMenu.type === "scene" && clipboard.type === "scene" && (
                <>
                  <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={() => paste("before")}>Paste Before</button>
                  <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={() => paste("after")}>Paste After</button>
                </>
              )}
              {contextMenu.type === "chapter" && clipboard.type === "chapter" && (
                <>
                  <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={() => paste("before")}>Paste Before</button>
                  <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={() => paste("after")}>Paste After</button>
                </>
              )}
            </>
          )}

          {contextMenu.type === "chapter" && (
            <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={() => { onAddScene(contextMenu.chapterId); setContextMenu(null); }}>
              Add Scene
            </button>
          )}

          <hr className="my-1 border-[var(--border)]" />
          <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={handleRename}>Rename</button>
          <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)] text-red-500" onClick={handleDelete}>Delete</button>
        </div>
      )}

      {/* Modals */}
      {renameModalOpen && itemToRename && (
        <EditItemModal 
          isOpen={renameModalOpen} 
          onClose={() => setRenameModalOpen(false)} 
          onSave={saveRename} 
          name={renameName} 
          onNameChange={setRenameName} 
        />
      )}

      {deleteModalOpen && itemToDelete && (
        <DeleteConfirmationModal 
          isOpen={deleteModalOpen} 
          onClose={() => setDeleteModalOpen(false)} 
          onConfirm={confirmDelete} 
        />
      )}
    </div>
  );
}