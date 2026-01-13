import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import SceneEditor from "../components/SceneEditor";
import Sidebar from "../components/Sidebar";
import { splitChapterContent } from "../utils/chapterComposer";
import type {Chapter, DocumentOutline } from "../types/document";
import "./Editor.css";

type EditorMode = "scene" | "chapter";

export default function Editor() {
  const { projectId, documentId } = useParams();
  const { logout } = useAuth();

  const [outline, setOutline] = useState<DocumentOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editorMode, setEditorMode] = useState<EditorMode>("scene");
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const [sceneContent, setSceneContent] = useState("");
  const [sceneWordcount, setSceneWordcount] = useState(0);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);

  /* -------------------- LOAD OUTLINE -------------------- */

  const reloadOutline = useCallback(async () => {
    const res = await api.get<DocumentOutline>(
      `/projects/${projectId}/documents/${documentId}/outline`
    );
    setOutline(res.data);
  }, [projectId, documentId]);

  useEffect(() => {
    (async () => {
      try {
        await reloadOutline();
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e.response?.status === 401) logout();
        else setError("Failed to load document");
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadOutline, logout]);

  /* -------------------- LOAD SCENE -------------------- */

  const loadScene = async (chapterId: string, sceneId: string) => {
    try {
      const res = await api.get(
        `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes/${sceneId}`
      );

      setEditorMode("scene");
      setActiveChapterId(chapterId);
      setActiveSceneId(sceneId);
      setSceneContent(res.data.content);
      setSceneWordcount(res.data.scene_wordcount);
    } catch (err) {
      console.error("Failed to load scene", err);
      setError("Failed to load scene");
    }
  };


  /* -------------------- LOAD CHAPTER -------------------- */

  const loadChapter = async (chapter: Chapter) => {
    try {
      const requests = chapter.scenes.map(scene =>
        api.get<{ content: string }>(
          `/projects/${projectId}/documents/${documentId}/chapters/${chapter.id}/scenes/${scene.id}`
        )
      );

      const responses = await Promise.all(requests);

      const contents = responses.map(r => r.data.content ?? "");

      setEditorMode("chapter");
      setActiveChapterId(chapter.id);
      setActiveSceneId(null);
      setSceneContent(
        contents.join(`<p style="text-align:center;">***</p>`)
      );
    } catch (err) {
      console.error("Failed to load chapter", err);
      setError("Failed to load chapter");
    }
  };


  /* -------------------- AUTOSAVE SCENE -------------------- */

  useEffect(() => {
    if (
      editorMode !== "scene" ||
      !activeChapterId ||
      !activeSceneId
    )
      return;

    const timeout = setTimeout(async () => {
      try {
        const res = await api.put<{ scene_wordcount: number }>(
          `/projects/${projectId}/documents/${documentId}/chapters/${activeChapterId}/scenes/${activeSceneId}`,
          { content: sceneContent }
        );
        setSceneWordcount(res.data.scene_wordcount);
      } catch (err) {
    console.error("Scene autosave failed", err);
    // optional toast / UI flag here
      }
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [
    sceneContent,
    editorMode,
    activeChapterId,
    activeSceneId,
    projectId,
    documentId,
  ]);

  /* -------------------- AUTOSAVE CHAPTER -------------------- */

  useEffect(() => {
    if (editorMode !== "chapter" || !outline || !activeChapterId)
      return;

    const timeout = setTimeout(async () => {
      try {
        const chapter = outline.chapters.find(c => c.id === activeChapterId);
        if (!chapter) return;
      
        const parts = splitChapterContent(sceneContent);
      
        for (let i = 0; i < chapter.scenes.length; i++) {
          await api.put(
            `/projects/${projectId}/documents/${documentId}/chapters/${chapter.id}/scenes/${chapter.scenes[i].id}`,
            { content: parts[i] ?? "" }
          );
        }
      } catch (err) {
        console.error("Chapter autosave failed", err);
      } finally {
        await reloadOutline();
      }
    }, 1200);

    return () => clearTimeout(timeout);
  }, [
    sceneContent,
    editorMode,
    activeChapterId,
    outline,
    projectId,
    documentId,
    reloadOutline,
  ]);

  /* -------------------- ADD -------------------- */

  const addChapter = async () => {
    try {
      await api.post(
        `/projects/${projectId}/documents/${documentId}/chapters`,
        { title: "New Chapter" }
      );
      await reloadOutline();
    } catch (err) {
      console.error("Failed to add chapter", err);
      setError("Failed to add chapter");
    }
  };

  const addScene = async (chapterId: string) => {
    try {
      await api.post(
        `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes`,
        { title: "New Scene" }
      );
      await reloadOutline();
    } catch (err) {
      console.error("Failed to add scene", err);
      setError("Failed to add scene");
    }
  };

  /* -------------------- SCENE REORDER -------------------- */
const handleSceneReorder = async (
  chapterId: string,
  orderedIds: string[]
) => {
  try {
    await api.put(
      `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes/reorder`,
      { ordered_ids: orderedIds }
    );
    await reloadOutline();
  } catch (err) {
    console.error("Failed to reorder scenes", err);
  }
};

  /* -------------------- RENAME / DELETE -------------------- */

async function renameChapter(chapterId: string, title: string) {
  try {
    await api.patch(
      `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}`,
      { title }
    );
  } catch (err) {
    console.error("Rename chapter failed", err);
  } finally {
    await reloadOutline();
  }
}

async function deleteChapter(chapterId: string) {
  try {
    await api.delete(
      `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}`
    );
  } catch (err) {
    console.error("Delete chapter failed", err);
  } finally {
    await reloadOutline();
  }
}

async function renameScene(
  chapterId: string,
  sceneId: string,
  title: string
) {
  try {
    await api.patch(
      `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes/${sceneId}`,
      { title }
    );
  } catch (err) {
    console.error("Rename scene failed", err);
  } finally {
    await reloadOutline();
  }
}

async function deleteScene(
  chapterId: string,
  sceneId: string
) {
  try {
    await api.delete(
      `/projects/${projectId}/documents/${documentId}/chapters/${chapterId}/scenes/${sceneId}`
    );
  } catch (err) {
    console.error("Delete scene failed", err);
  } finally {
    await reloadOutline();
  }
}

  /* -------------------- RENDER -------------------- */

  if (loading) return <p>Loading…</p>;
  if (!outline) {
    return <p>{error || "Unable to load outline."}</p>;
  }

  return (
    <div className="editor-container">
      <Sidebar
        title={outline.title}
        chapters={outline.chapters}
        activeSceneId={activeSceneId}
        openChapterId={openChapterId}
        onToggleChapter={setOpenChapterId}
        onSceneClick={loadScene}
        onLoadChapter={loadChapter}
        onAddChapter={addChapter}
        onAddScene={addScene}
        onReorderScenes={handleSceneReorder}
        onRenameChapter={renameChapter}
        onDeleteChapter={deleteChapter}
        onRenameScene={renameScene}
        onDeleteScene={deleteScene}
      />
      <main className="editor-main">
        <h3>
          {editorMode === "scene" && "Scene Editor"}
          {editorMode === "chapter" && "Chapter Editor"}
        </h3>
        <SceneEditor
          content={sceneContent}
          onChange={setSceneContent}
        />
        {editorMode === "scene" && (
          <p>Scene wordcount: {sceneWordcount}</p>
        )}
      </main>
    </div>
  );
}
