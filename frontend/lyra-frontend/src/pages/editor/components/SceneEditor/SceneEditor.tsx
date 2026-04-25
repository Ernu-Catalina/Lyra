import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
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
    const fs = el.style.fontSize;
    if (fs && fs.endsWith("px")) {
      el.style.removeProperty("font-size");
    }
    if (el.tagName === "SPAN") {
      el.style.removeProperty("line-height");
    }
    if (!el.getAttribute("style")?.trim()) {
      el.removeAttribute("style");
    }
    if (el.tagName === "SPAN" && !el.hasAttributes() && el.parentElement) {
      const frag = doc.createDocumentFragment();
      el.childNodes.forEach((child) => frag.appendChild(child.cloneNode(true)));
      el.parentElement.replaceChild(frag, el);
    }
  });

  return doc.body.innerHTML;
}

const SceneEditor = forwardRef<Editor | null, SceneEditorProps>(
  ({ content, onChange, editable = true, onEditorReady }, ref) => {
    const editorRef = useRef<Editor | null>(null);
    const lastSetContentRef = useRef<string>("");

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
        const html = editor.getHTML();
        onChange(html);
      },
    });

    // Keep a ref to the current editor instance
    useEffect(() => {
      editorRef.current = editor;
      onEditorReady?.(editor);
    }, [editor, onEditorReady]);

    // Safe content sync — only update when content actually changes and editor is ready
    useEffect(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;

      const cleanContent = sanitizeContent(content);
      const currentHtml = sanitizeContent(currentEditor.getHTML());

      // Strong guard: only set if content is meaningfully different
      if (cleanContent !== currentHtml && cleanContent !== lastSetContentRef.current) {
        lastSetContentRef.current = cleanContent;
        currentEditor.commands.setContent(cleanContent, false); // false = don't trigger onUpdate
      }
    }, [content]);

    useImperativeHandle(ref, () => editor, [editor]);

    if (!editor) return null;

    return <EditorContent editor={editor} />;
  }
);

SceneEditor.displayName = "SceneEditor";

export default SceneEditor;