import SceneEditor from "./SceneEditor/SceneEditor";
import { SceneEditorPageView } from "./SceneEditor/SceneEditorPageView";
import { composeChapter } from "../utils/chapterComposer";
import type { Chapter } from "../../../types/document";

interface ChapterEditorViewProps {
  chapter: Chapter;
  initialContent?: string;
  onContentChange: (html: string) => void;
}

export function ChapterEditorView({ chapter, initialContent, onContentChange }: ChapterEditorViewProps) {
  const composed = composeChapter(chapter.scenes);

  return (
    <SceneEditorPageView>
      <SceneEditor
        content={initialContent ?? composed}
        onChange={onContentChange}
        editable={true}
      />
    </SceneEditorPageView>
  );
}