import SceneEditor from "./SceneEditor/SceneEditor";
import { SceneEditorPageView } from "./SceneEditor/SceneEditorPageView";
import { composeChapter } from "../utils/chapterComposer";
import type { Chapter } from "../../../types/document";

interface ChapterEditorViewProps {
  chapter: Chapter;
  initialContent?: string;
  onContentChange: (html: string) => void;
  onSceneUpdate?: (sceneId: string, content: string) => void; // optional for future
}

export function ChapterEditorView({ chapter, initialContent, onContentChange }: ChapterEditorViewProps) {
  const htmlContent = initialContent ?? composeChapter(chapter.scenes);

  return (
    <SceneEditorPageView>
      <SceneEditor
        content={htmlContent}
        onChange={(html) => {
          onContentChange(html);
          // Optional: parse and call onSceneUpdate for each scene
          // const updated = extractScenesFromHtml(html);
          // updated.forEach(scene => onSceneUpdate?.(scene.id!, scene.content!));
        }}
        editable={true}
        onEditorReady={(editor) => {
          // No need for custom nodes or JSON parsing anymore
        }}
      />
    </SceneEditorPageView>
  );
}