// src/components/Sidebar/Sidebar.tsx
import { SidebarHeader } from "./SidebarHeader";
import ChapterBlock from "./ChapterBlock";
import type { Chapter, Scene, DocumentOutline } from "../../../../types/document";
import { useState } from "react";
import EditItemModal from "../../../../common_components/EditItemModal";
import DeleteConfirmationModal from "../../../../common_components/DeleteConfirmationModal";
import api from "../../../../api/client";
import { useEffect } from "react";

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
  const [itemToRename, setItemToRename] = useState<{ id: string; type: "chapter" | "scene"; title: string } | null>(null);
  const [renameName, setRenameName] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: "chapter" | "scene"; parentId?: string } | null>(null);

  const showToast = (msg: string) => alert(msg); // replace with real toast

  // Close menu on outside click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // COPY
  const handleCopy = () => {
    if (!contextMenu) return;
    const ch = chapters.find(c => c.id === contextMenu.chapterId)!;
    if (contextMenu.type === "chapter") {
      setClipboard({ type: "chapter", chapter: { ...ch }, action: "copy" });
    } else {
      const sc = ch.scenes.find(s => s.id === contextMenu.sceneId)!;
      setClipboard({ type: "scene", scene: { ...sc }, chapterId: ch.id, action: "copy" });
    }
    setContextMenu(null);
  };

  // CUT
  const handleCut = () => {
    handleCopy();
    if (clipboard) setClipboard(prev => prev ? { ...prev, action: "cut" } : null);
  };

  // PASTE AFTER / BEFORE
const paste = async (position: "before" | "after") => {
  if (!clipboard || !contextMenu) return;

  const isChapter = contextMenu.type === "chapter";
  const targetId = isChapter ? contextMenu.chapterId : contextMenu.sceneId!;

  try {
    // Create new item in backend
    const payload = {
      title: clipboard.type === "chapter" ? clipboard.chapter.title + " (copy)" : clipboard.scene.title + " (copy)",
    };

    const endpoint = isChapter
      ? `/projects/${projectId}/documents/${documentId}/chapters`
      : `/projects/${projectId}/documents/${documentId}/chapters/${contextMenu.chapterId}/scenes`;

    const res = await api.post(endpoint, payload);
    const newItem = res.data;

    // Reorder locally (optimistic UI)
    setOutline(prev => {
      if (!prev) return prev;
      let newChapters = [...prev.chapters];

      if (isChapter) {
        const idx = newChapters.findIndex(c => c.id === targetId);
        if (position === "after") newChapters.splice(idx + 1, 0, newItem);
        else newChapters.splice(idx, 0, newItem);
      } else {
        const chIdx = newChapters.findIndex(c => c.id === contextMenu.chapterId);
        const scIdx = newChapters[chIdx].scenes.findIndex(s => s.id === targetId);
        if (position === "after") newChapters[chIdx].scenes.splice(scIdx + 1, 0, newItem);
        else newChapters[chIdx].scenes.splice(scIdx, 0, newItem);
      }

      return { ...prev, chapters: newChapters };
    });

    // If cut → delete original
    if (clipboard.action === "cut") {
      const deleteUrl = clipboard.type === "chapter"
        ? `/projects/${projectId}/documents/${documentId}/chapters/${clipboard.chapter.id}`
        : `/projects/${projectId}/documents/${documentId}/chapters/${clipboard.chapterId}/scenes/${clipboard.scene.id}`;
      await api.delete(deleteUrl);
    }

    reloadOutline();
    showToast("Pasted successfully");
  } catch (err) {
    console.error(err);
    showToast("Paste failed");
  }

  setContextMenu(null);
};

  // RENAME
  const handleRename = () => {
    if (!contextMenu) return;

    const ch = chapters.find(c => c.id === contextMenu.chapterId)!;
    if (contextMenu.type === "chapter") {
      setItemToRename({ id: ch.id, type: "chapter", title: ch.title });
    } else {
      const sc = ch.scenes.find(s => s.id === contextMenu.sceneId!)!;
      setItemToRename({ id: sc.id, type: "scene", title: sc.title });
    }
    setRenameName(itemToRename?.title || "");
    setRenameModalOpen(true);
    setContextMenu(null);
  };

  const saveRename = async () => {
  if (!itemToRename || !renameName.trim()) return;

  const endpoint = itemToRename.type === "chapter"
    ? `/projects/${projectId}/documents/${documentId}/chapters/${itemToRename.id}`
    : `/projects/${projectId}/documents/${documentId}/chapters/${contextMenu?.chapterId}/scenes/${itemToRename.id}`;

  try {
    await api.patch(endpoint, { title: renameName.trim() });
    showToast("Renamed successfully");
    reloadOutline();
  } catch (err) {
    console.error(err);
    showToast("Rename failed");
  }

  setRenameModalOpen(false);
  setItemToRename(null);
};

const confirmDelete = async () => {
  if (!itemToDelete) return;

  const endpoint = itemToDelete.type === "chapter"
    ? `/projects/${projectId}/documents/${documentId}/chapters/${itemToDelete.id}`
    : `/projects/${projectId}/documents/${documentId}/chapters/${itemToDelete.parentId}/scenes/${itemToDelete.id}`;

  try {
    await api.delete(endpoint);
    showToast("Deleted successfully");
    reloadOutline();
  } catch (err) {
    console.error(err);
    showToast("Delete failed");
  }

  setDeleteModalOpen(false);
  setItemToDelete(null);
};

  // DELETE
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

  const openMenu = (e: React.MouseEvent, type: "chapter" | "scene", chapterId: string, sceneId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Force close any existing menu first
    setContextMenu(null);

    // Open new menu at exact mouse position
    setTimeout(() => {
      setContextMenu({ x: e.clientX, y: e.clientY, type, chapterId, sceneId });
    }, 0);
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
        <div className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg py-1 min-w-[200px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={handleCopy}>Copy</button>
          <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={handleCut}>Cut</button>

          {clipboard && (
            <>
              <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={() => paste("before")}>Paste Before</button>
              <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={() => paste("after")}>Paste After</button>
            </>
          )}

          {contextMenu.type === "chapter" && <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={() => { onAddScene(contextMenu.chapterId); setContextMenu(null); }}>Add Scene</button>}

          <hr className="my-1 border-[var(--border)]" />
          <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)]" onClick={handleRename}>Rename</button>
          <button className="w-full px-4 py-2 text-left hover:bg-[var(--bg-primary)] text-red-500" onClick={handleDelete}>Delete</button>
        </div>
      )}

      {/* Modals */}
      {renameModalOpen && <EditItemModal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)} onSave={saveRename} name={renameName} onNameChange={setRenameName} />}
      {deleteModalOpen && <DeleteConfirmationModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={confirmDelete} />}
    </div>
  );
}