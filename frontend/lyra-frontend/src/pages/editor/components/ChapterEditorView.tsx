import { useDocumentSettings } from "../context/DocumentSettingsContext";
import { formatChapterTitle } from "../utils/chapterTitleFormatter";
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
  const { settings } = useDocumentSettings();
  const htmlContent = initialContent ?? composeChapter(chapter.scenes);

  const { html: chapterTitleText, style: chapterTitleStyle } = formatChapterTitle(
    chapter.order + 1,
    chapter.title,
    settings
  );

  return (
    <SceneEditorPageView>
      {/* Chapter Title */}
      {chapterTitleText && (
        <div style={chapterTitleStyle}>
          {chapterTitleText}
        </div>
      )}
      {/* Chapter Content */}
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