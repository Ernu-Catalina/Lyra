import SceneEditor from "./SceneEditor/SceneEditor";
import { SceneEditorPageView } from "./SceneEditor/SceneEditorPageView";
import { composeChapter } from "../utils/chapterComposer";
import type { Chapter } from "../../../types/document";

interface ChapterEditorViewProps {
  chapter: Chapter;
  initialContent?: string; // Optional prop for initial content
}

export function ChapterEditorView({ chapter, initialContent }: ChapterEditorViewProps) {
  const composed = composeChapter(chapter.scenes);

  return (
    <SceneEditorPageView>
      <div className="relative">
        <SceneEditor
          content={initialContent ?? composed}
          onChange={() => {}} // noop – read-only
          editable={false}    // ← disable editing
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)]/90 text-[var(--text-primary)] px-8 py-5 rounded-xl shadow-xl max-w-md text-center">
            <p className="text-lg font-medium mb-2">Chapter view is read-only</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Please edit individual scenes for changes to be saved.
            </p>
          </div>
        </div>
      </div>
    </SceneEditorPageView>
  );
}