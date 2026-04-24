import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "../../extensions/FontSize";
import { Indentation } from "../../extensions/Indentation";
import { HeadingWithSize } from "../../extensions/HeadingWithSize";

interface SceneEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  onEditorReady?: (editor: Editor | null) => void;
}

function sanitizeContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    // Strip legacy px font sizes — pt values from the toolbar are kept as-is
    const fs = el.style.fontSize;
    if (fs && fs.endsWith("px")) {
      el.style.removeProperty("font-size");
    }

    // Line-height belongs on block nodes, not spans
    if (el.tagName === "SPAN") {
      el.style.removeProperty("line-height");
    }

    // Remove empty style attributes
    if (!el.getAttribute("style")?.trim()) {
      el.removeAttribute("style");
    }

    // Unwrap attribute-less spans to keep the DOM clean
    if (el.tagName === "SPAN" && !el.hasAttributes() && el.parentElement) {
      const frag = doc.createDocumentFragment();
      el.childNodes.forEach((child) => frag.appendChild(child.cloneNode(true)));
      el.parentElement.replaceChild(frag, el);
    }
  });

  return doc.body.innerHTML;
}

/**
 * SceneEditor
 *
 * Plain Tiptap rich-text editor with no pagination logic.
 * Content flows continuously — SceneEditorPageView wraps it in a
 * single growing paper surface. Pagination only happens in the
 * read-only Chapter and Document views (PaginatedPageView).
 */
const SceneEditor = forwardRef<Editor | null, SceneEditorProps>(
  ({ content, onChange, editable = true, onEditorReady }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: false }),
        HeadingWithSize.configure({ levels: [1, 2, 3, 4] }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
        }),
        TextStyle,
        FontFamily,
        FontSize,
        Indentation,
      ],
      content,
      editable,
      editorProps: {
        attributes: { class: "focus:outline-none min-h-full" },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
    });

    useImperativeHandle(ref, () => editor, [editor]);

    useEffect(() => {
      onEditorReady?.(editor);
    }, [editor, onEditorReady]);

    // Sync external content changes (e.g. switching scenes)
    useEffect(() => {
      if (!editor) return;
      if (content !== editor.getHTML()) {
        editor.chain().setContent(sanitizeContent(content), false).run();
      }
    }, [content, editor]);

    if (!editor) return null;

    return <EditorContent editor={editor} />;
  }
);

SceneEditor.displayName = "SceneEditor";

export default SceneEditor;