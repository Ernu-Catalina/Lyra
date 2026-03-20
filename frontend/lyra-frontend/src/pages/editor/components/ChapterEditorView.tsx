import SceneEditor from "./SceneEditor/SceneEditor";
import { SceneEditorPageView } from "./SceneEditor/SceneEditorPageView";
import { composeChapter } from "../utils/chapterComposer";
import type { Chapter } from "../../../types/document";

interface ChapterEditorViewProps {
  chapter: Chapter;
  initialContent?: string;
  onContentChange: (html: string) => void;
  onSceneUpdate?: (sceneId: string, content: string) => void;
  readOnly?: boolean;  // ← NEW PROP (optional, default false)
}

export function ChapterEditorView({
  chapter,
  initialContent,
  onContentChange,
  onSceneUpdate,
  readOnly = false,  // default: editable
}: ChapterEditorViewProps) {
  const htmlContent = initialContent ?? composeChapter(chapter.scenes);

  return (
    <SceneEditorPageView>
      <SceneEditor
        content={htmlContent}
        onChange={onContentChange}
        editable={!readOnly}          // ← disables editing when readOnly=true
        onEditorReady={(editor) => {
          // No need for custom nodes or JSON parsing anymore
        }}
      />
    </SceneEditorPageView>
  );
}