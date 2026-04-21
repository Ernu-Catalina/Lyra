import { useDocumentSettings } from "../context/DocumentSettingsContext";
import { formatChapterTitle } from "../utils/chapterTitleFormatter";
import SceneEditor from "./SceneEditor/SceneEditor";
import { SceneEditorPageView } from "./SceneEditor/SceneEditorPageView";
import { composeChapter } from "../utils/chapterComposer";
import type { DocumentOutline } from "../../../types/document";

interface DocumentEditorViewProps {
  outline: DocumentOutline;
  scale?: number;
}

export function DocumentEditorView({ outline, scale = 1 }: DocumentEditorViewProps) {
  const { settings } = useDocumentSettings();

  // Compose all chapters into a single HTML string with titles.
  // Chapter titles use the same formatChapterTitle utility as ChapterEditorView
  // so they always match document settings.
  const fullContent = outline.chapters
    .map((ch, index) => {
      const { html: titleText, style: titleStyle } = formatChapterTitle(
        ch.order + 1,
        ch.title,
        settings
      );

      const titleHtml = titleText
        ? `<div style="${styleToCss(titleStyle)}">${titleText}</div>`
        : "";

      const bodyHtml = composeChapter(ch.scenes);

      // Page break between chapters (not after last)
      const breakHtml =
        settings.pageBreakAfterChapter && index < outline.chapters.length - 1
          ? '<div class="page-break"></div>'
          : "";

      return `${titleHtml}${bodyHtml}${breakHtml}`;
    })
    .join("");

  return (
    <SceneEditorPageView scale={scale}>
      <SceneEditor
        content={fullContent}
        onChange={() => {}} // document view is read-only
        editable={false}
        scale={scale}
        onEditorReady={() => {}}
      />
    </SceneEditorPageView>
  );
}

const styleToCss = (style: Record<string, any>): string => {
  if (!style || typeof style !== "object") return "";

  const unitlessProperties = new Set([
    "zIndex", "opacity", "flexGrow", "flexShrink", "lineHeight",
    "order", "zoom", "fontWeight", "animationIterationCount",
    "columnCount", "fillOpacity", "flex", "floodOpacity",
    "stopOpacity", "strokeDasharray", "strokeDashoffset",
    "strokeMiterlimit", "strokeOpacity", "strokeWidth"
  ]);

  return Object.entries(style)
    .filter(([_, value]) => value != null) // skip null or undefined
    .map(([key, value]) => {
      const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();

      let cssValue = value;
      if (typeof value === "number" && !unitlessProperties.has(key)) {
        cssValue = `${value}px`;
      }

      return `${kebabKey}: ${cssValue}`;
    })
    .join("; ");
}