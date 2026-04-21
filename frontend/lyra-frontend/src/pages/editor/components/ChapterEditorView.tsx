import { useRef } from "react";
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
  readOnly?: boolean;
  scale?: number;
}

export function ChapterEditorView({
  chapter,
  initialContent,
  onContentChange,
  onSceneUpdate,
  readOnly = false,
  scale = 1,
}: ChapterEditorViewProps) {
  const { settings } = useDocumentSettings();

  const { html: chapterTitleText, style: chapterTitleStyle } = formatChapterTitle(
    chapter.order + 1,
    chapter.title,
    settings
  );

  const htmlContent = initialContent ?? composeChapter(chapter.scenes);

  return (
    <SceneEditorPageView scale={scale}>
      {chapterTitleText && (
        <div
          contentEditable={false}
          suppressContentEditableWarning
          style={{
            ...chapterTitleStyle,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {chapterTitleText}
        </div>
      )}
      <SceneEditor
        content={htmlContent}
        onChange={onContentChange}
        editable={!readOnly}
        scale={scale}
        onEditorReady={() => {}}
      />
    </SceneEditorPageView>
  );
}