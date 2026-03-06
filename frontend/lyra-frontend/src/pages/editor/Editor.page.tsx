// src/pages/editor/Editor.page.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth"; // ← ADD THIS IMPORT
import api from "../../api/client";
import NavigationBar from "../../common_components/NavigationBar";
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

export default function EditorPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate(); // ← ADD THIS
  const { logout } = useAuth();   // ← ADD THIS (provides logout function)

  const { outline, loading, error, reloadOutline } = useDocumentOutline(projectId, documentId);
  const { activeChapterId, activeSceneId, editorMode, selectScene, selectChapter } = useActiveScene();

  const [sceneContent, setSceneContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [sceneWordcount, setSceneWordcount] = useState(0);
  const [chapterEditorContent, setChapterEditorContent] = useState("");
  const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(new Set());
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [projectName, setProjectName] = useState<string>("Loading...");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch project name once (for nav bar)
  useEffect(() => {
    if (!projectId) return;

    api.get(`/projects/${projectId}`)
      .then((res) => {
        setProjectName(res.data.name || "Untitled Project");
      })
      .catch((err) => {
        console.error("Failed to fetch project name:", err);
        setProjectName("Project");
      });
  }, [projectId]);

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

  const handleAddScene = async (chapterId: string) => {
    if (!projectId || !documentId || !chapterId) {
      showToast("Cannot add scene: missing IDs");
      return;
    }

    try {
      await api.post(
        `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes`,
        { title: "New Scene" }
      );

      showToast("Scene created successfully");
      reloadOutline(); // Refresh sidebar to show new scene
    } catch (err: any) {
      console.error("Failed to add scene:", err);
      const detail = err.response?.data?.detail || "Failed to create scene";
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

  // Auto-create chapter + scene when document is empty
useEffect(() => {
  if (loading || error || !outline || outline.chapters.length > 0) return;

  const initializeEmptyDocument = async () => {
    try {
      // 1. Create first chapter
      const chapterRes = await api.post(
        `/projects/${projectId}/documents/${documentId}/chapters`,
        { title: "Chapter 1" }
      );
      const newChapterId = chapterRes.data.id; // assuming backend returns { id, title, ... }

      // 2. Create first scene in that chapter
      await api.post(
        `/projects/${projectId}/documents/${documentId}/chapters/${newChapterId}/scenes`,
        { title: "Scene 1" }
      );

      showToast("Empty document initialized with Chapter 1 and Scene 1");
      reloadOutline(); // Load the new structure
    } catch (err: any) {
      console.error("Failed to initialize empty document:", err);
      showToast("Failed to initialize document");
    }
  };

  initializeEmptyDocument();
}, [loading, error, outline, projectId, documentId, reloadOutline, showToast]);

// Load scene content when active scene changes
  useEffect(() => {
    if (!projectId || !documentId || !activeChapterId || !activeSceneId) return;
  
    api.get(`/projects/${projectId}/documents/${documentId}/chapters/${activeChapterId}/scenes/${activeSceneId}`)
      .then((res) => {
        const content = res.data.content ?? "";
        setSceneContent(content);
        setLastSavedContent(content);
        setSceneWordcount(countWordsFromHtml(content));
      })
      .catch((err) => {
        console.error("Failed to load scene:", err);
        showToast("Failed to load scene content");
      });
  }, [projectId, documentId, activeChapterId, activeSceneId]);

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
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Navigation Bar – fixed at top */}
      <NavigationBar
        title={projectName} // ← NOW uses project name (not document title)
        onLogout={() => {
          logout();
          navigate("/login");
        }}
        onSettings={() => navigate("/settings")}
        isEditorView={true}
        onExport={() => {
          console.log("Export clicked – implement document export here");
          // Future: generate PDF/DOCX/JSON export
        }}
      />

      {/* Rest of editor content */}
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
            onAddScene={handleAddScene}
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
            <div className="p-8 text-center text-[var(--text-secondary)]">
              Select a chapter or scene to begin editing
            </div>
          )
        }
        footer={
          editorMode === "scene" && sceneWordcount > 0 ? (
            <div className="text-right text-sm text-[var(--text-secondary)] px-6 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]/50">
              Scene word count: {sceneWordcount.toLocaleString()}
            </div>
          ) : null
        }
      />
    </div>
  );
}