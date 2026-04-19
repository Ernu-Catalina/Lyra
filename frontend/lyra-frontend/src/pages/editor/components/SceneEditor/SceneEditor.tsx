//sceneEditor.tsx
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "../../extensions/FontSize";
import { Indentation } from "../../extensions/Indentation";
import { HeadingWithSize } from "../../extensions/HeadingWithSize";
import { useDocumentSettings } from "../../context/DocumentSettingsContext";

interface SceneEditorProps {
  content: string; // now always HTML string
  onChange: (html: string) => void;
  editable?: boolean;
  onEditorReady?: (editor: Editor | null) => void;
}

function sanitizeContent(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    doc.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
      const fs = el.style.fontSize;
      if (fs && fs.endsWith("px")) {
        // Legacy px value written by old toolbar — strip it entirely.
        // Text will inherit the correct size from .page-container.
        el.style.removeProperty("font-size");
      }
      // pt values written by the new toolbar are kept as-is.

      // Strip line-height from spans — belongs on block nodes only.
      if (el.tagName === "SPAN") {
        el.style.removeProperty("line-height");
      }

      // Remove empty style attributes.
      if (!el.getAttribute("style")?.trim()) {
        el.removeAttribute("style");
      }

      // Unwrap spans with no remaining attributes.
      if (
        el.tagName === "SPAN" &&
        !el.hasAttributes() &&
        el.parentElement
      ) {
        const frag = doc.createDocumentFragment();
        el.childNodes.forEach(child => frag.appendChild(child.cloneNode(true)));
        el.parentElement.replaceChild(frag, el);
      }
    });

    return doc.body.innerHTML;
  }

const SceneEditor = forwardRef<Editor | null, SceneEditorProps>(
    ({ content, onChange, editable = true, onEditorReady }, ref) => {

      // 1. ALL hooks must come first, before any other code
      const { settings } = useDocumentSettings();

      // 2. useEditor comes after hooks, and can now reference settings
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
          attributes: {
            class: "focus:outline-none min-h-full",
          },
        },
        onUpdate: ({ editor }) => {
          onChange(editor.getHTML());
        },
        parseOptions: {
          preserveWhitespace: "full",
        },
      });

      // 3. useImperativeHandle and other effects after useEditor
      useImperativeHandle(ref, () => editor, [editor]);

      useEffect(() => {
        onEditorReady?.(editor);
      }, [editor, onEditorReady]);

      useEffect(() => {
        if (!editor) return;
        const currentHtml = editor.getHTML();
        if (content !== currentHtml) {
          const clean = sanitizeContent(content);
          editor.chain().setContent(clean, false).run();
        }
      }, [content, editor]);

      if (!editor) return null;

      return <EditorContent editor={editor} />;
    }
  );

SceneEditor.displayName = "SceneEditor";

export default SceneEditor;