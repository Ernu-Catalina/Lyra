// src/features/editor/Editor.page.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/client";
import { EditorLayout } from "../../components/templates/EditorLayout";
import Sidebar from "../../components/organisms/Sidebar/Sidebar";
import { EditorToolbar } from "../../components/organisms/EditorToolbar";
import { SceneEditorPageView } from "../../components/organisms/SceneEditor/SceneEditorPageView";
import SceneEditor from "../../components/organisms/SceneEditor/SceneEditor";
import { ChapterEditorView } from "../../components/organisms/ChapterEditorView";
import { useDocumentOutline } from "./hooks/useDocumentOutline";
import { useActiveScene } from "./hooks/useActiveScene";
import { useAutosave } from "./hooks/useAutosaveScene";
import { countWordsFromHtml } from "./utils/wordcount";
import { composeChapter } from "./utils/chapterComposer";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Editor } from "@tiptap/react";

export default function EditorPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const { outline, loading, error, reloadOutline } = useDocumentOutline(projectId, documentId);
  const { activeChapterId, activeSceneId, editorMode, selectScene, selectChapter } = useActiveScene();
  const [sceneContent, setSceneContent] = useState("");
  const [sceneWordcount, setSceneWordcount] = useState(0);
  const [chapterEditorContent, setChapterEditorContent] = useState("");
  const [openChapterIds, setOpenChapterIds] = useState<Set<string>>(new Set());
  const editorRef = useRef<Editor | null>(null);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  // Sync ref → state (safe way to use ref value in render)
  useEffect(() => {
    setEditorInstance(editorRef.current);
  }, []); // Runs once after mount — ref is stable

  // Autosave only for scene mode
  useAutosave(
    projectId,
    documentId,
    activeChapterId ?? undefined,
    activeSceneId ?? undefined,
    sceneContent,
    editorMode === "scene" && sceneContent !== sceneContent // ← adjust if you have lastSaved
  );

  const loadScene = useCallback(
    async (chapterId: string, sceneId: string) => {
      if (!projectId || !documentId) return;
      try {
        const res = await api.get(
          `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes/${sceneId}`
        );
        const scene = res.data as { content?: string };
        const content = scene.content ?? "";
        setSceneContent(content);
        setSceneWordcount(countWordsFromHtml(content));
        selectScene(chapterId, sceneId);
      } catch (err) {
        console.error("Failed to load scene", err);
      }
    },
    [projectId, documentId, selectScene]
  );

  const loadChapter = useCallback(
    (chapterId: string) => {
      const chapter = outline?.chapters.find((c) => c.id === chapterId);
      if (chapter) {
        setChapterEditorContent(composeChapter(chapter.scenes));
      }
      selectChapter(chapterId);
    },
    [outline, selectChapter]
  );

  const toggleChapter = (chapterId: string) => {
    setOpenChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const addChapter = async () => {
    if (!projectId || !documentId) return;
    try {
      await api.post(`/projects/${projectId}/documents/${documentId}/chapters`, {
        title: "New Chapter",
      });
      await reloadOutline();
    } catch (err) {
      console.error(err);
    }
  };

  const addScene = async (chapterId: string) => {
    if (!projectId || !documentId) return;
    try {
      await api.post(
        `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes`,
        { title: "New Scene" }
      );
      await reloadOutline();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSceneReorder = async (chapterId: string, event: DragEndEvent) => {
    console.log("Scene reorder in chapter", chapterId, event.active.id, event.over?.id);
    // TODO: implement real reorder API call
    await reloadOutline();
  };

  if (loading) return <p>Loading document…</p>;
  if (error || !outline) return <p style={{ color: "red" }}>{error || "Failed to load outline"}</p>;

  return (
    <EditorLayout
      sidebar={
        <Sidebar
          title={outline.title}
          chapters={outline.chapters}
          activeSceneId={activeSceneId}
          openChapterIds={openChapterIds}
          onToggleChapter={toggleChapter}
          onSceneClick={loadScene}
          onLoadChapter={loadChapter}
          onAddChapter={addChapter}
          onAddScene={addScene}
          onReorderScenes={handleSceneReorder}
        />
      }
      toolbar={editorInstance ? <EditorToolbar editor={editorInstance} /> : null}
      editor={
        editorMode === "scene" ? (
          <SceneEditorPageView>
            <SceneEditor
              ref={editorRef}
              content={sceneContent}
              onChange={(html) => {
                setSceneContent(html);
                setSceneWordcount(countWordsFromHtml(html));
              }}
            />
          </SceneEditorPageView>
        ) : (
          activeChapterId && outline?.chapters.find((c) => c.id === activeChapterId) ? (
            <ChapterEditorView
              chapter={outline.chapters.find((c) => c.id === activeChapterId)!}
              initialContent={chapterEditorContent}
              onContentChange={setChapterEditorContent}
            />
          ) : (
            <div>Chapter not found</div>
          )
        )
      }
      footer={
        editorMode === "scene" && sceneWordcount > 0 ? (
          <div>Scene word count: {sceneWordcount}</div>
        ) : null
      }
    />
  );
}