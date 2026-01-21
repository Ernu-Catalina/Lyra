// src/components/organisms/ChapterEditorView.tsx
import SceneEditor from "./SceneEditor/SceneEditor";
import { SceneEditorPageView } from "./SceneEditor/SceneEditorPageView";
import { composeChapter } from "../utils/chapterComposer";
import type { Chapter } from "../../../types/document";

interface ChapterEditorViewProps {
  chapter: Chapter;
  onContentChange: (html: string) => void;
  initialContent?: string;
}

export function ChapterEditorView({ chapter, onContentChange, initialContent }: ChapterEditorViewProps) {
  const composedContent = composeChapter(chapter.scenes);

  return (
    <SceneEditorPageView>
      <SceneEditor
        content={initialContent ?? composedContent}
        onChange={onContentChange}
        editable={true}
      />
    </SceneEditorPageView>
  );
}