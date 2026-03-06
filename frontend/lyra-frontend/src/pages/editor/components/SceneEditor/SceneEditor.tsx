import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";

interface SceneEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  onEditorReady?: (editor: Editor | null) => void;
}

const SceneEditor = forwardRef<Editor | null, SceneEditorProps>(
  ({ content, onChange, editable = true, onEditorReady }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: false }),
        Heading.configure({ levels: [1, 2, 3, 4] }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
        }),
      ],
      content,
      editable,
      editorProps: {
        attributes: {
          class: "prose prose-invert max-w-none focus:outline-none min-h-[60vh] px-4 py-6",
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
    });

    useImperativeHandle(ref, () => editor, [editor]);

    useEffect(() => {
      onEditorReady?.(editor);
    }, [editor, onEditorReady]);

    // Sync external content changes
    useEffect(() => {
      if (!editor || !content) return;
      if (content !== editor.getHTML()) {
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