import { SidebarHeader } from "./SidebarHeader";
import ChapterBlock from "./ChapterBlock";
import type { Chapter, Scene, DocumentOutline } from "../../../../types/document";
import { useState, useEffect } from "react";
import EditItemModal from "../../../../common_components/EditItemModal";
import DeleteConfirmationModal from "../../../../common_components/DeleteConfirmationModal";
import MoveConflictModal from "../../../../common_components/MoveConflictModal";
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
  reloadOutline
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };


  // Close menu on outside click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // COPY
  const handleCopy = () => {
    if (!contextMenu) return;

    if (contextMenu.type === "chapter") {
      const chapter = chapters.find(c => c.id === contextMenu.chapterId);
      if (chapter) setClipboard({ type: "chapter", chapter, action: "copy" });
    } else {
      const chapter = chapters.find(c => c.id === contextMenu.chapterId);
      const scene = chapter?.scenes.find(s => s.id === contextMenu.sceneId);
      if (scene && chapter) {
        setClipboard({ type: "scene", scene, chapterId: chapter.id, action: "copy" });
      }
    }
    setContextMenu(null);
  };

  // CUT
  const handleCut = () => {
    handleCopy();
    if (clipboard) setClipboard(prev => prev ? { ...prev, action: "cut" } : null);
  };

  // PASTE AFTER
  const handlePasteAfter = () => {
    if (!clipboard || !contextMenu) return;

    setOutline(prev => {
      if (!prev) return prev;

      const newChapters = prev.chapters.map(ch => {
        if (contextMenu.type === "chapter") {
          if (ch.id !== contextMenu.chapterId) return ch;

          const index = prev.chapters.findIndex(c => c.id === ch.id);
          const newChapter = { ...clipboard.chapter, id: crypto.randomUUID() };

          const newChaptersList = [...prev.chapters];
          newChaptersList.splice(index + 1, 0, newChapter);
          return newChaptersList.map((c, i) => ({ ...c, order: i }));
        }

        if (ch.id !== contextMenu.chapterId) return ch;

        const index = ch.scenes.findIndex(s => s.id === contextMenu.sceneId);
        if (index === -1) return ch;

        const newScene = { ...clipboard.scene, id: crypto.randomUUID() };
        const newScenes = [...ch.scenes];
        newScenes.splice(index + 1, 0, newScene);

        return { ...ch, scenes: newScenes.map((s, i) => ({ ...s, order: i })) };
      });

      return { ...prev, chapters: newChapters };
    });

    if (clipboard.action === "cut") {
      // Optional: API delete original (add if needed)
    }

    setContextMenu(null);
  };

  // PASTE BEFORE (similar logic, splice at index)
  const handlePasteBefore = () => {
    // Implement similarly to handlePasteAfter, but splice at index instead of index + 1
    // For brevity: mirror the splice line in handlePasteAfter with `splice(index, 0, newItem)`
    // You can copy-paste and adjust
  };

  // ADD SCENE
  const handleAddSceneFromMenu = () => {
    if (!contextMenu || contextMenu.type !== "chapter") return;
    onAddScene(contextMenu.chapterId);
    setContextMenu(null);
  };

  // RENAME
  const handleRename = () => {
    if (!contextMenu) return;

    let item: { id: string; type: "chapter" | "scene"; title: string } | null = null;

    if (contextMenu.type === "chapter") {
      const ch = chapters.find(c => c.id === contextMenu.chapterId);
      if (ch) item = { id: ch.id, type: "chapter", title: ch.title };
    } else {
      const ch = chapters.find(c => c.id === contextMenu.chapterId);
      const scene = ch?.scenes.find(s => s.id === contextMenu.sceneId);
      if (scene) item = { id: scene.id, type: "scene", title: scene.title };
    }

    if (item) {
      setItemToRename(item);
      setRenameName(item.title);
      setRenameModalOpen(true);
    }

    setContextMenu(null);
  };

  const saveRename = async () => {
    if (!itemToRename || !renameName.trim()) return;

    const endpoint = itemToRename.type === "chapter"
      ? `/projects/${projectId}/documents/${documentId}/chapters/${itemToRename.id}`
      : `/projects/${projectId}/documents/${documentId}/chapters/${contextMenu?.chapterId}/scenes/${itemToRename.id}`;

    try {
      await api.patch(endpoint, { title: renameName.trim() });
      showToast("Renamed");
      reloadOutline(); // refresh outline
    } catch (err) {
      showToast("Rename failed");
    }

    setRenameModalOpen(false);
    setItemToRename(null);
  };

  // DELETE
  const handleDelete = () => {
    if (!contextMenu) return;

    let item: { id: string; type: "chapter" | "scene"; parentId?: string } | null = null;

    if (contextMenu.type === "chapter") {
      item = { id: contextMenu.chapterId, type: "chapter" };
    } else {
      item = { id: contextMenu.sceneId!, type: "scene", parentId: contextMenu.chapterId };
    }

    if (item) {
      setItemToDelete(item);
      setDeleteModalOpen(true);
    }

    setContextMenu(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const endpoint = itemToDelete.type === "chapter"
      ? `/projects/${projectId}/documents/${documentId}/chapters/${itemToDelete.id}`
      : `/projects/${projectId}/documents/${documentId}/chapters/${itemToDelete.parentId}/scenes/${itemToDelete.id}`;

    try {
      await api.delete(endpoint);
      showToast("Deleted");
      reloadOutline();
    } catch (err) {
      showToast("Delete failed");
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader
        documentTitle={title}
        onAddChapter={onAddChapter}
        onDocumentClick={onDocumentClick}
      />

      <div className="flex-1 overflow-y-auto px-1 py-1">
        {chapters.map((chapter) => (
          <ChapterBlock
            key={chapter.id}
            chapter={chapter}
            isOpen={openChapterIds.has(chapter.id)}
            activeSceneId={activeSceneId}
            activeChapterId={activeChapterId}
            onToggle={() => onToggleChapter(chapter.id)}
            onAddScene={() => onAddScene(chapter.id)}
            onSceneClick={(sceneId) => onSceneClick(chapter.id, sceneId)}
            onChapterClick={() => onChapterClick(chapter.id)}
            onContextMenuChapter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: "chapter",
                chapterId: chapter.id,
              });
            }}
            onContextMenuScene={(e, sceneId) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: "scene",
                chapterId: chapter.id,
                sceneId,
              });
            }}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-lg py-1 min-w-[180px] text-[var(--text-primary)]"
        >
          <button className="w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]" onClick={handleCopy}>
            Copy
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]" onClick={handleCut}>
            Cut
          </button>

          <div className="border-t border-[var(--border)] my-1" />

          <button className="w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]" onClick={handlePasteBefore}>
            Paste Before
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]" onClick={handlePasteAfter}>
            Paste After
          </button>

          {contextMenu.type === "chapter" && (
            <>
              <div className="border-t border-[var(--border)] my-1" />
              <button className="w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]" onClick={handleAddSceneFromMenu}>
                Add Scene
              </button>
            </>
          )}

          <div className="border-t border-[var(--border)] my-1" />

          <button className="w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)]" onClick={handleRename}>
            Rename
          </button>
          <button className="w-full text-left px-4 py-2 hover:bg-[var(--bg-primary)] text-red-500" onClick={handleDelete}>
            Delete
          </button>
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
          title={`Delete ${itemToDelete.type === "chapter" ? "Chapter" : "Scene"}?`}
          message="This action cannot be undone."
        />
      )}
    </div>
  );
}