import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import api from "../../api/client";
import NavigationBar from "../../common_components/NavigationBar";
import { DocumentSettingsProvider } from "./context/DocumentSettingsContext";
import { EditorLayout } from "./components/EditorLayout";
import Sidebar from "./components/Sidebar/Sidebar";
import { EditorToolbar } from "./components/EditorToolbar";
import { SceneEditorPageView } from "./components/SceneEditor/SceneEditorPageView";
import SceneEditor from "./components/SceneEditor/SceneEditor";
import { ChapterEditorView } from "./components/ChapterEditorView";
import { DocumentEditorView } from "./components/DocumentEditorView";
import { useDocumentOutline } from "./hooks/useDocumentOutline";
import { useActiveScene } from "./hooks/useActiveScene";
import { useAutosaveScene } from "./hooks/useAutosaveScene";
import { useFullscreen } from "./hooks/useFullscreen";
import { countWordsFromHtml, formatWordCount } from "./utils/wordcount";
import type { Editor } from "@tiptap/react";
import type { DocumentOutline } from "../../types/document";
import { EditorFooter } from "./components/EditorFooter";
import "./styles/editor.css";
import { ExportModal } from "./components/ExportModal";

export default function EditorPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const { outline: serverOutline, loading, error, reloadOutline } = useDocumentOutline(projectId, documentId);
  const [outline, setOutline] = useState<DocumentOutline | undefined>(serverOutline);

  useEffect(() => {
    if (serverOutline) setOutline(serverOutline);
  }, [serverOutline]);

  const [userDefaultView, setUserDefaultView] = useState<"document" | "chapter" | "scene">("scene");
  const { activeChapterId, activeSceneId, editorMode, selectScene, selectChapter, setEditorMode } = useActiveScene();

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lastEditTimestamp, setLastEditTimestamp] = useState<number | null>(null);

  const [sceneContent, setSceneContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [sceneWordcount, setSceneWordcount] = useState(0);
  const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(new Set());
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [projectName, setProjectName] = useState<string>("Loading...");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDocumentWarning, setShowDocumentWarning] = useState(false);
  const editorLayoutRef = useRef<HTMLDivElement>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  // Add these new states
  const [sidebarWidth, setSidebarWidth] = useState(300);        // Default width in px
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleFullscreen = useFullscreen(editorLayoutRef, isFullscreen, setIsFullscreen);

  const [userSettings, setUserSettings] = useState<{
    wordcountDisplay: string[];
    sceneFormat: string;
    chapterFormat: string;
    documentFormat: string;
  }>({
    wordcountDisplay: ["scene"],
    sceneFormat: "exact",
    chapterFormat: "exact",
    documentFormat: "exact",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Force landscape orientation on mobile
useEffect(() => {
  // Add viewport meta for better mobile control
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, orientation=landscape');
  } else {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, orientation=landscape';
    document.head.appendChild(meta);
  }

  // Optional: Show a message if user tries to rotate to portrait
  const handleOrientationChange = () => {
    if (window.innerWidth < window.innerHeight && window.innerWidth < 500) {
      // You can show a toast or overlay here if desired
      console.warn("Editor works best in landscape mode");
    }
  };

  window.addEventListener('resize', handleOrientationChange);
  window.addEventListener('orientationchange', handleOrientationChange);

  return () => {
    window.removeEventListener('resize', handleOrientationChange);
    window.removeEventListener('orientationchange', handleOrientationChange);
  };
}, []);

  // Load saved sidebar width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem(`editor_sidebar_width_${documentId}`);
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth));
    }

    const savedOpen = localStorage.getItem(`editor_sidebar_open_${documentId}`);
    if (savedOpen !== null) {
      setIsSidebarOpen(savedOpen === "true");
    }
  }, [documentId]);

  // Save sidebar width when changed
  useEffect(() => {
    localStorage.setItem(`editor_sidebar_width_${documentId}`, sidebarWidth.toString());
  }, [sidebarWidth, documentId]);

  // Save open/closed state
  useEffect(() => {
    localStorage.setItem(`editor_sidebar_open_${documentId}`, isSidebarOpen.toString());
  }, [isSidebarOpen, documentId]);

  // ── User settings & default view ──────────────────────────────────
  useEffect(() => {
    api.get("/me")
      .then((res) => {
        const s = res.data.settings || {};
        setUserSettings({
          wordcountDisplay: Array.isArray(s.wordcount_display) ? s.wordcount_display : ["scene"],
          sceneFormat: s.scene_wordcount_format || "exact",
          chapterFormat: s.chapter_wordcount_format || "exact",
          documentFormat: s.document_wordcount_format || "exact",
        });
        const view = s.default_view;
        if (["document", "chapter", "scene"].includes(view)) {
          setUserDefaultView(view);
        }
      })
      .catch(console.error);
  }, []);

  // Apply default view when outline first loads
  useEffect(() => {
    if (loading || !outline || outline.chapters.length === 0) return;
    if (activeChapterId || activeSceneId) return;

    if (userDefaultView === "document") {
      setEditorMode("document");
    } else if (userDefaultView === "chapter" && outline.chapters[0]) {
      selectChapter(outline.chapters[0].id);
    } else if (outline.chapters[0]?.scenes[0]) {
      selectScene(outline.chapters[0].id, outline.chapters[0].scenes[0].id);
    }
  }, [loading, outline, userDefaultView, activeChapterId, activeSceneId, selectChapter, selectScene, setEditorMode]);

  // ── Word count computation ─────────────────────────────────────────
  const sceneWC = sceneWordcount;

  const chapterWC = (() => {
    if (!outline || !activeChapterId) return 0;
    const chapter = outline.chapters.find((c) => c.id === activeChapterId);
    if (!chapter) return 0;
    return chapter.scenes.reduce(
      (sum, scene) => sum + (scene.id === activeSceneId ? sceneWC : scene.wordcount || 0),
      0
    );
  })();

  const documentWC = (() => {
    if (!outline) return 0;
    const total = outline.total_wordcount || 0;
    if (!activeChapterId) return total;
    const savedChapterWC = outline.chapters.find((c) => c.id === activeChapterId)?.wordcount || 0;
    return total - savedChapterWC + chapterWC;
  })();

  const wordCountParts: string[] = [];
  if (editorMode === "scene") {
    if (userSettings.wordcountDisplay.includes("scene"))
      wordCountParts.push(`Scene: ${formatWordCount(sceneWC, userSettings.sceneFormat)}`);
    if (userSettings.wordcountDisplay.includes("chapter"))
      wordCountParts.push(`Chapter: ${formatWordCount(chapterWC, userSettings.chapterFormat)}`);
    if (userSettings.wordcountDisplay.includes("document"))
      wordCountParts.push(`Document: ${formatWordCount(documentWC, userSettings.documentFormat)}`);
  } else if (editorMode === "chapter") {
    if (userSettings.wordcountDisplay.includes("chapter"))
      wordCountParts.push(`Chapter: ${formatWordCount(chapterWC, userSettings.chapterFormat)}`);
    if (userSettings.wordcountDisplay.includes("document"))
      wordCountParts.push(`Document: ${formatWordCount(documentWC, userSettings.documentFormat)}`);
  } else if (editorMode === "document") {
    if (userSettings.wordcountDisplay.includes("document"))
      wordCountParts.push(`Document: ${formatWordCount(documentWC, userSettings.documentFormat)}`);
  }

  const handleExport = async (format: "pdf" | "docx") => {
  if (!projectId || !documentId) throw new Error("Missing document context");
  const response = await api.get(
    `/projects/${projectId}/documents/${documentId}/export/${format}`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${outline?.title || "document"}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

  // ── Project name ──────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    api.get(`/projects/${projectId}`)
      .then((res) => setProjectName(res.data.name || "Untitled Project"))
      .catch(() => setProjectName("Project"));
  }, [projectId]);

  // ── Chapter / scene management ────────────────────────────────────
  const handleAddChapter = async () => {
    if (!projectId || !documentId) return;
    try {
      await api.post(`/projects/${projectId}/documents/${documentId}/chapters`, {
        title: "New Chapter",
      });
      reloadOutline();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to create chapter");
    }
  };

  const handleAddScene = async (chapterId: string) => {
    if (!projectId || !documentId) return;
    try {
      await api.post(
        `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes`,
        { title: "New Scene" }
      );
      reloadOutline();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to create scene");
    }
  };

  const updateSceneInOutline = (sceneId: string, newContent: string) => {
    if (!outline) return;
    const newWordcount = countWordsFromHtml(newContent);
    const updatedChapters = outline.chapters.map((ch) => ({
      ...ch,
      scenes: ch.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, content: newContent, wordcount: newWordcount } : scene
      ),
    }));
    const updatedChaptersWithWC = updatedChapters.map((ch) => ({
      ...ch,
      wordcount: ch.scenes.reduce((sum, s) => sum + (s.wordcount || 0), 0),
    }));
    setOutline({
      ...outline,
      chapters: updatedChaptersWithWC,
      total_wordcount: updatedChaptersWithWC.reduce((sum, ch) => sum + ch.wordcount, 0),
    });
  };

  // ── Autosave ──────────────────────────────────────────────────────
  useAutosaveScene({
    projectId,
    documentId,
    activeChapterId: activeChapterId ?? undefined,
    activeSceneId: activeSceneId ?? undefined,
    content: sceneContent,
    shouldSave: editorMode === "scene" && sceneContent !== lastSavedContent,
    onSaved: (saved) => {
      setLastSavedContent(saved);
    },
    onStatusChange: (status, message) => {
      setSaveStatus(status);
      setSaveMessage(message);
    },
  });

  // Keep "Saved" visible for 60s after last edit
  useEffect(() => {
    if (saveStatus === "error" || saveStatus === "saving") return;
    if (lastEditTimestamp && Date.now() - lastEditTimestamp < 60000) {
      setSaveStatus("saved");
      return;
    }
    if (saveStatus === "saved") {
      const timer = setTimeout(() => setSaveStatus("idle"), 60000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, lastEditTimestamp]);

  // ── Auto-initialize empty document ───────────────────────────────
  useEffect(() => {
    if (loading || error || !outline || outline.chapters.length > 0) return;

    const init = async () => {
      try {
        const chapterRes = await api.post(
          `/projects/${projectId}/documents/${documentId}/chapters`,
          { title: "Chapter 1" }
        );
        await api.post(
          `/projects/${projectId}/documents/${documentId}/chapters/${chapterRes.data.id}/scenes`,
          { title: "Scene 1" }
        );
        reloadOutline();
      } catch (err) {
        console.error("Failed to initialize empty document:", err);
      }
    };

    init();
  }, [loading, error, outline, projectId, documentId, reloadOutline]);

  // ── Load scene content on selection change ────────────────────────
  useEffect(() => {
    if (!projectId || !documentId || !activeChapterId || !activeSceneId) return;

    api
      .get(`/projects/${projectId}/documents/${documentId}/chapters/${activeChapterId}/scenes/${activeSceneId}`)
      .then((res) => {
        const raw = res.data.content ?? "";
        setSceneContent(raw);
        setLastSavedContent(raw);
        setSceneWordcount(countWordsFromHtml(raw));
      })
      .catch(() => showToast("Failed to load scene content"));
  }, [projectId, documentId, activeChapterId, activeSceneId]);

  const toggleChapter = (chapterId: string) => {
    setOpenChapterIds((prev) => {
      const next = new Set(prev);
      next.has(chapterId) ? next.delete(chapterId) : next.add(chapterId);
      return next;
    });
  };

  const handleSceneClick = (chapterId: string, sceneId: string) => {
    selectScene(chapterId, sceneId);
  };

  const handleChapterClick = (chapterId: string) => {
    selectChapter(chapterId);
    setEditorMode("chapter");
  };

  const handleDocumentClick = () => {
    setEditorMode("document");
    if ((outline?.total_wordcount ?? 0) > 50000) {
      setShowDocumentWarning(true);
      setTimeout(() => setShowDocumentWarning(false), 8000);
    }
  };

  // ── Render guards ─────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center h-screen">Loading document…</div>;
  if (error || !outline) return <div className="text-red-500 p-8">{error || "Failed to load outline"}</div>;
  if (!projectId || !documentId) return <div className="flex items-center justify-center h-screen">Project or document not found.</div>;

  const activeChapter = activeChapterId
    ? outline.chapters.find((c) => c.id === activeChapterId)
    : null;

  // ── Editor area ───────────────────────────────────────────────────
  const renderEditor = () => {
    if (editorMode === "scene" && activeChapterId && activeSceneId) {
      return (
        <SceneEditorPageView scale={scale}>
          <SceneEditor
            content={sceneContent}
            onChange={(html) => {
              setSceneContent(html);
              setSceneWordcount(countWordsFromHtml(html));
              setLastEditTimestamp(Date.now());
              if (activeSceneId) updateSceneInOutline(activeSceneId, html);
            }}
            onEditorReady={setEditorInstance}
          />
        </SceneEditorPageView>
      );
    }

    if (editorMode === "chapter" && activeChapter) {
      return <ChapterEditorView chapter={activeChapter} scale={scale} />;
    }

    if (editorMode === "document") {
      return <DocumentEditorView outline={outline} scale={scale} />;
    }

    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        Select a chapter or scene to begin editing
      </div>
    );
  };

  return (
    <DocumentSettingsProvider projectId={projectId} documentId={documentId}>
      <div className="flex flex-col h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
        {!isFullscreen && (
          <NavigationBar
            title={projectName}
            onLogout={() => { logout(); navigate("/login"); }}
            onSettings={() => navigate("/settings")}
            isEditorView={true}
            onExport={() => setShowExportModal(true)}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
          />
        )}

        <EditorLayout
          ref={editorLayoutRef}
          isFullscreen={isFullscreen}
          sidebarWidth={sidebarWidth}
          isSidebarOpen={isSidebarOpen}
          onSidebarResize={setSidebarWidth}
          onSidebarToggle={() => setIsSidebarOpen(prev => !prev)}
          sidebar={
            <Sidebar
              title={outline.title}
              chapters={outline.chapters}
              activeSceneId={activeSceneId}
              activeChapterId={activeChapterId}
              openChapterIds={openChapterIds}
              onToggleChapter={toggleChapter}
              onSceneClick={handleSceneClick}
              onAddChapter={handleAddChapter}
              onAddScene={handleAddScene}
              onChapterClick={handleChapterClick}
              onDocumentClick={handleDocumentClick}
              setOutline={setOutline}
              projectId={projectId}
              documentId={documentId}
              reloadOutline={reloadOutline}
              isSidebarOpen={isSidebarOpen}
              onSidebarToggle={() => setIsSidebarOpen(prev => !prev)}
            />
          }
          toolbar={<EditorToolbar editor={editorInstance} onSettingsApplied={reloadOutline} />}
          editor={renderEditor()}
          footer={
            <EditorFooter
              wordCountText={wordCountParts.length > 0 ? wordCountParts.join(" | ") : null}
              scale={scale}
              onScaleChange={setScale}
              editorMode={editorMode}
              isFullscreen={isFullscreen}
              onFullscreenToggle={toggleFullscreen}
            />
          }
        />

        {showDocumentWarning && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-amber-800/90 text-white px-6 py-3 rounded-lg shadow-xl z-50">
            Document view may be slow for large documents.
          </div>
        )}

        {toastMessage && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] px-6 py-3 rounded-lg shadow-xl z-50">
            {toastMessage}
          </div>
        )}
      </div>
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}
    </DocumentSettingsProvider>
  );
}