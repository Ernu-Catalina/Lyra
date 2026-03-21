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
import { formatWordCount } from "./utils/wordcount";
import { DocumentOutline } from "../../types/document";
import { WordCountFooter } from "./components/WordCountFooter";
import { DocumentEditorView } from "./components/DocumentEditorView";

export default function EditorPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate(); 
  const { logout } = useAuth();
  
  // Temporary: set to false to allow editing in chapter view again
  const CHAPTER_VIEW_READ_ONLY = true;

  const { outline: serverOutline, loading, error, reloadOutline } = useDocumentOutline(projectId, documentId);

  const [outline, setOutline] = useState(serverOutline);

  useEffect(() => {
  if (serverOutline) {
    setOutline(prev => {
      if (!prev) return serverOutline;
      return serverOutline;
    });
  }
}, [serverOutline]);

  const [userDefaultView, setUserDefaultView] = useState<"document" | "chapter" | "scene">("scene");
  const { activeChapterId, activeSceneId, editorMode, selectScene, selectChapter, setEditorMode } = useActiveScene();

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // Timestamp of last user edit (used to keep "Saved" visible for 60s after typing)
  const [lastEditTimestamp, setLastEditTimestamp] = useState<number | null>(null);

  const [sceneContent, setSceneContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [sceneWordcount, setSceneWordcount] = useState(0);
  const [chapterEditorContent, setChapterEditorContent] = useState("");
  const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(new Set());
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [projectName, setProjectName] = useState<string>("Loading...");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

// ── Word count warning threshold ─────────────────────────────────────────
  const documentWordCount = outline?.total_wordcount || 0;
  const [showDocumentWarning, setShowDocumentWarning] = useState(false);

const handleSceneClick = (chapterId: string, sceneId: string) => {
  console.log("Scene clicked:", { chapterId, sceneId });
  selectScene(chapterId, sceneId);
  setEditorMode("scene");
};

const handleChapterClick = (chapterId: string) => {
  console.log("Chapter clicked:", chapterId);
  selectChapter(chapterId);
  setEditorMode("chapter");
};

  const handleDocumentClick = () => {
    setEditorMode("document");
    if (documentWordCount > 50000) {
      setShowDocumentWarning(true);
      setTimeout(() => setShowDocumentWarning(false), 8000);
    }
  };

    const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch user settings on mount
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
    })
    .catch(console.error);
}, []);

useEffect(() => {
    api.get("/me").then(res => {
      const view = res.data.settings?.default_view;
      if (["document", "chapter", "scene"].includes(view)) {
        setUserDefaultView(view);
      }
    }).catch(() => {});
  }, []);

  // Apply default view when outline first loads
  useEffect(() => {
    if (loading || !outline || outline.chapters.length === 0) return;

    // If no active chapter/scene yet → apply default
    if (!activeChapterId && !activeSceneId) {
      if (userDefaultView === "document") {
        setEditorMode("document");
      } else if (userDefaultView === "chapter" && outline.chapters[0]) {
        selectChapter(outline.chapters[0].id);
        setEditorMode("chapter");
      } else if (outline.chapters[0]?.scenes[0]) {
        selectScene(outline.chapters[0].id, outline.chapters[0].scenes[0].id);
        setEditorMode("scene");
      }
    }
  }, [loading, outline, userDefaultView, selectChapter, selectScene, setEditorMode]);

// ── Live word count computation ─────────────────────────────────────────────
// Updates immediately after typing in scene mode

const sceneWC = sceneWordcount;

// Chapter WC: sum all scenes, using live value for active scene
const chapterWC = (() => {
  if (!outline || !activeChapterId) return 0;
  const chapter = outline.chapters.find(c => c.id === activeChapterId);
  if (!chapter) return 0;

  return chapter.scenes.reduce((sum, scene) => {
    return sum + (scene.id === activeSceneId ? sceneWC : (scene.wordcount || 0));
  }, 0);
})();

// Document WC: adjust total by replacing active chapter's saved value
const documentWC = (() => {
  if (!outline) return 0;
  let total = outline.total_wordcount || 0;

  if (activeChapterId) {
    const savedChapterWC = outline.chapters.find(c => c.id === activeChapterId)?.wordcount || 0;
    total = total - savedChapterWC + chapterWC;
  }

  return total;
})();

// ── Format for footer ───────────────────────────────────────────────────────
const parts: string[] = [];

// SCENE MODE → all allowed
if (editorMode === "scene") {
  if (userSettings.wordcountDisplay.includes("scene")) {
    parts.push(`Scene: ${formatWordCount(sceneWC, userSettings.sceneFormat)}`);
  }
  if (userSettings.wordcountDisplay.includes("chapter")) {
    parts.push(`Chapter: ${formatWordCount(chapterWC, userSettings.chapterFormat)}`);
  }
  if (userSettings.wordcountDisplay.includes("document")) {
    parts.push(`Document: ${formatWordCount(documentWC, userSettings.documentFormat)}`);
  }
}

// CHAPTER MODE → no scene
if (editorMode === "chapter") {
  if (userSettings.wordcountDisplay.includes("chapter")) {
    parts.push(`Chapter: ${formatWordCount(chapterWC, userSettings.chapterFormat)}`);
  }
  if (userSettings.wordcountDisplay.includes("document")) {
    parts.push(`Document: ${formatWordCount(documentWC, userSettings.documentFormat)}`);
  }
}

// DOCUMENT MODE → only document
if (editorMode === "document") {
  if (userSettings.wordcountDisplay.includes("document")) {
    parts.push(`Document: ${formatWordCount(documentWC, userSettings.documentFormat)}`);
  }
}

const footerText = parts.length > 0 ? parts.join(" | ") : null;

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

const handleSceneUpdateFromChapter = async (sceneId: string, content: string) => {
  if (!projectId || !documentId || !activeChapterId) return;

  try {
    await api.put(
      `/projects/${projectId}/documents/${documentId}/chapters/${activeChapterId}/scenes/${sceneId}`,
      { content }
    );
    showToast(`Scene ${sceneId} updated`);
    reloadOutline(); // Refresh outline with new wordcounts/content
  } catch (err) {
    console.error("Failed to save scene from chapter:", err);
    showToast("Failed to save changes");
  }
};

const updateSceneInOutline = (sceneId: string, newContent: string) => {
  if (!outline) return;

  const newWordcount = countWordsFromHtml(newContent);

  const updatedChapters = outline.chapters.map(ch => ({
    ...ch,
    scenes: ch.scenes.map(scene =>
      scene.id === sceneId
        ? { ...scene, content: newContent, wordcount: newWordcount }
        : scene
    )
  }));

  // recompute chapter + document wordcounts
  const updatedChaptersWithWC = updatedChapters.map(ch => {
    const chapterWC = ch.scenes.reduce((sum, s) => sum + (s.wordcount || 0), 0);
    return { ...ch, wordcount: chapterWC };
  });

  const totalWC = updatedChaptersWithWC.reduce((sum, ch) => sum + ch.wordcount, 0);

  // IMPORTANT: replace outline (immutable update)
  setOutline({
    ...outline,
    chapters: updatedChaptersWithWC,
    total_wordcount: totalWC,
  });
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
    onStatusChange: (status, message) => {
    setSaveStatus(status);
    setSaveMessage(message);
  },
  });

// Keep "Saved" visible for 60 seconds after last edit or successful save
useEffect(() => {
  if (saveStatus === 'error') {
    // Error stays until next save attempt
    return;
  }

  if (saveStatus === 'saving') {
    // Saving overrides everything until complete
    return;
  }

  const now = Date.now();

  // If user edited recently (< 60s ago), force "Saved" (even if not yet autosaved)
  if (lastEditTimestamp && now - lastEditTimestamp < 60000) {
    setSaveStatus('saved');
    return;
  }

  // Otherwise, if last save was recent, keep "Saved"
  if (saveStatus === 'saved') {
    const timer = setTimeout(() => {
      setSaveStatus('idle');
    }, 60000);

    return () => clearTimeout(timer);
  }

  // Default to idle when nothing recent happened
  setSaveStatus('idle');
}, [saveStatus, lastEditTimestamp]);

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
      const rawContent = res.data.content ?? "";
      setSceneContent(rawContent); // ← raw HTML string from backend
      setLastSavedContent(rawContent);
      setSceneWordcount(countWordsFromHtml(rawContent));
    })
    .catch((err) => {
      console.error("Failed to load scene:", err);
      showToast("Failed to load scene content");
    });
}, [projectId, documentId, activeChapterId, activeSceneId]);

// Compose chapter content when active chapter changes OR when active scene content changes
useEffect(() => {
  if (!activeChapterId || !outline || editorMode !== "chapter") return;

  const chapter = outline.chapters.find((c) => c.id === activeChapterId);
  if (chapter) {
    // Re-compose with latest scene content (optimistic)
    const updatedScenes = chapter.scenes.map(scene => {
      if (scene.id === activeSceneId) {
        return { ...scene, content: sceneContent };
      }
      return scene;
    });

    setChapterEditorContent(composeChapter(updatedScenes));
  }
}, [activeChapterId, outline, editorMode, sceneContent, activeSceneId]);

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
        saveStatus={saveStatus}
        saveMessage={saveMessage}
      />

      {/* Rest of editor content */}
      <EditorLayout
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
                  const wc = countWordsFromHtml(html);
                  setSceneWordcount(wc);
                  setLastEditTimestamp(Date.now());
                
                  // 🔥 THIS FIXES EVERYTHING
                  if (activeSceneId) {
                    updateSceneInOutline(activeSceneId, html);
                  }
                }}
                onEditorReady={setEditorInstance}
              />
            </SceneEditorPageView>
          ) : activeChapterId && outline.chapters.find((c) => c.id === activeChapterId) ? (
            <ChapterEditorView
              chapter={outline.chapters.find((c) => c.id === activeChapterId)!}
              initialContent={chapterEditorContent}
              onContentChange={setChapterEditorContent}
              onSceneUpdate={handleSceneUpdateFromChapter}
              readOnly={CHAPTER_VIEW_READ_ONLY}
            />
          ) : editorMode === "document" ? (
            outline ? <DocumentEditorView outline={outline} /> : <div>Loading...</div>
          ) : (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              Select a chapter or scene to begin editing
            </div>
          )
        }
        footer={
          parts.length > 0 ? (
            <div>
              {parts.join(" | ")}
            </div>
          ) : null
        }
      />
        {/* Temporary warning overlay */}
        {showDocumentWarning && (
          <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 bg-amber-800/90 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-fade-out">
            We do not recommend editing in Document view for performance reasons.
          </div>
        )}
    </div>
  );
}