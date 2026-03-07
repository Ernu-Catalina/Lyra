import SceneEditor from "./SceneEditor/SceneEditor";
import { SceneEditorPageView } from "./SceneEditor/SceneEditorPageView";
import { composeChapter } from "../utils/chapterComposer";
import type { Chapter } from "../../../types/document";

interface ChapterEditorViewProps {
  chapter: Chapter;
  onSceneUpdate: (sceneId: string, content: string) => void;
}

export function ChapterEditorView({ chapter, onSceneUpdate }: ChapterEditorViewProps) {
  const jsonContent = composeChapter(chapter.scenes);

  return (
    <SceneEditorPageView>
      <SceneEditor
        content={jsonContent}
        onChange={(html, json) => {
          // Optional: live preview HTML if needed
        }}
        editable={true}
        useSceneNodes={true} // ← enables node-based editing
        onEditorReady={(editor) => {
          // Optional: listen for updates per node
          editor?.on("update", ({ editor }) => {
            const json = editor.getJSON();
            const updatedScenes = extractScenesFromJson(json);
            updatedScenes.forEach((scene) => {
              if (scene.id && scene.content !== undefined) {
                onSceneUpdate(scene.id, scene.content);
              }
            });
          });
        }}
      />
    </SceneEditorPageView>
  );
}