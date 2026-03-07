// src/components/SceneEditor/SceneEditor.tsx
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import { SceneNode } from "../../extensions/SceneNode"; // ← NEW IMPORT

interface SceneEditorProps {
  content: string | object; // now accepts HTML or JSON
  onChange: (html: string, json?: any) => void; // return both
  editable?: boolean;
  onEditorReady?: (editor: Editor | null) => void;
  useSceneNodes?: boolean; // NEW: toggle for chapter/document mode
}

const SceneEditor = forwardRef<Editor | null, SceneEditorProps>(
  ({ content, onChange, editable = true, onEditorReady, useSceneNodes = false }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: false }),
        Heading.configure({ levels: [1, 2, 3, 4] }),
        TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
        ...(useSceneNodes ? [SceneNode] : []),
      ],
      content,
      editable,
      editorProps: {
        attributes: {
          class: "prose prose-invert max-w-none focus:outline-none min-h-[60vh] px-4 py-6",
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML(), editor.getJSON());
      },
    });

    useImperativeHandle(ref, () => editor, [editor]);

    useEffect(() => {
      onEditorReady?.(editor);
    }, [editor, onEditorReady]);

    useEffect(() => {
      if (!editor || !content) return;
      if (JSON.stringify(content) !== JSON.stringify(editor.getJSON())) {
        editor.commands.setContent(content, false);
      }
    }, [content, editor]);

    if (!editor) return null;

    return (
      <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] shadow-sm">
        <EditorContent editor={editor} />
      </div>
    );
  }
);

SceneEditor.displayName = "SceneEditor";

export default SceneEditor;