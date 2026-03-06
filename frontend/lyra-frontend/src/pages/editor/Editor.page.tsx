import { useParams } from "react-router-dom";
import { EditorLayout } from "./components/EditorLayout";
import Sidebar from "./components/Sidebar/Sidebar";
import { EditorToolbar } from "./components/EditorToolbar";
import { SceneEditorPageView } from "./components/SceneEditor/SceneEditorPageView";
import SceneEditor from "./components/SceneEditor/SceneEditor";
import { ChapterEditorView } from "./components/ChapterEditorView";
import { useDocumentOutline } from "./hooks/useDocumentOutline";
import { useActiveScene } from "./hooks/useActiveScene";
import { useAutosaveScene } from "./hooks/useAutosaveScene";
import { countWordsFromHtml } from "./utils/wordcount";
import { composeChapter } from "./utils/chapterComposer";
import type { Editor } from "@tiptap/react";
import { useEffect, useState} from "react";
import api from "../../api/client";

export default function EditorPage() {
  const { projectId, documentId } = useParams();
  const { outline, loading, error, reloadOutline } = useDocumentOutline(projectId, documentId);
  const { activeChapterId, activeSceneId, editorMode, selectScene, selectChapter } = useActiveScene();

  const [sceneContent, setSceneContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [sceneWordcount, setSceneWordcount] = useState(0);
  const [chapterEditorContent, setChapterEditorContent] = useState("");
  const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(new Set());
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddChapter = async () => {
    if (!projectId || !documentId) {
      showToast("Cannot add chapter: missing project or document ID");
      return;
    }

    try {
      await api.post(`/projects/${projectId}/documents/${documentId}/chapters`, {
        title: "New Chapter",
      });

      showToast("Chapter created successfully");
      reloadOutline(); // Refresh the outline → new chapter appears in sidebar
    } catch (err: any) {
      console.error("Failed to add chapter:", err);
      const detail = err.response?.data?.detail || "Failed to create chapter";
      showToast(detail);
    }
  };

  // Autosave only in scene mode
  useAutosaveScene({
    projectId,
    documentId,
    activeChapterId: activeChapterId ?? undefined,
    activeSceneId: activeSceneId ?? undefined,
    content: sceneContent,
    shouldSave: editorMode === "scene" && sceneContent !== lastSavedContent,
    onSaved: (saved) => {
      setLastSavedContent(saved);
      showToast("Scene saved");
    },
  });

  // Load scene content when active scene changes
  useEffect(() => {
    if (!documentId || !activeChapterId || !activeSceneId) return;

    api.get(`/projects/.../documents/${documentId}/chapters/${activeChapterId}/scenes/${activeSceneId}`)
      .then((res) => {
        const content = res.data.content ?? "";
        setSceneContent(content);
        setLastSavedContent(content);
        setSceneWordcount(countWordsFromHtml(content));
      })
      .catch(console.error);
  }, [documentId, activeChapterId, activeSceneId]);

  // Compose chapter content when active chapter changes
  useEffect(() => {
    if (!activeChapterId || !outline) return;
    const chapter = outline.chapters.find((c) => c.id === activeChapterId);
    if (chapter) {
      setChapterEditorContent(composeChapter(chapter.scenes));
      selectChapter(activeChapterId);
    }
  }, [activeChapterId, outline, selectChapter]);

  const toggleChapter = (chapterId: string) => {
    setOpenChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading document…</div>;
  if (error || !outline) return <div className="text-red-500 p-8">{error || "Failed to load outline"}</div>;

  return (
    <EditorLayout
      sidebar={
        <Sidebar
          title={outline.title}
          chapters={outline.chapters}
          activeSceneId={activeSceneId}
          openChapterIds={openChapterIds}
          onToggleChapter={toggleChapter}
          onSceneClick={(chapterId, sceneId) => selectScene(chapterId, sceneId)}
          onAddChapter={handleAddChapter}
          onAddScene={(chapterId) => {/* TODO: implement */}}
        />
      }
      toolbar={editorInstance ? <EditorToolbar editor={editorInstance} /> : null}
      editor={
        editorMode === "scene" ? (
          <SceneEditorPageView>
            <SceneEditor
              content={sceneContent}
              onChange={(html) => {
                setSceneContent(html);
                setSceneWordcount(countWordsFromHtml(html));
              }}
              onEditorReady={setEditorInstance}
            />
          </SceneEditorPageView>
        ) : activeChapterId && outline.chapters.find((c) => c.id === activeChapterId) ? (
          <ChapterEditorView
            chapter={outline.chapters.find((c) => c.id === activeChapterId)!}
            initialContent={chapterEditorContent}
            onContentChange={setChapterEditorContent}
          />
        ) : (
          <div className="p-8 text-center text-[var(--text-secondary)]">Select a chapter or scene</div>
        )
      }
      footer={
        editorMode === "scene" && sceneWordcount > 0 ? (
          <div className="text-right text-sm text-[var(--text-secondary)] px-4 py-2">
            Scene word count: {sceneWordcount}
          </div>
        ) : null
      }
    />
    
  );
}