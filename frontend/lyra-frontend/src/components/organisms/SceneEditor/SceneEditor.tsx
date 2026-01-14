// src/components/organisms/SceneEditor/SceneEditor.tsx
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import styles from "./SceneEditor.module.css";

interface SceneEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

// Use forwardRef + expose Editor instance
const SceneEditor = forwardRef<Editor | null, SceneEditorProps>(
  ({ content, onChange, editable = true }, ref) => {
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
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: styles.editor,
        },
      },
    });

    // Expose the editor instance to parent via ref
    useImperativeHandle(ref, () => editor, [editor]);

    // Sync external content → editor (without loop)
    useEffect(() => {
      if (!editor) return;

      // Avoid triggering onUpdate unnecessarily
      if (content !== editor.getHTML()) {
        editor.commands.setContent(content, {
          emitUpdate: false,
        });
      }
    }, [content, editor]);

    return <EditorContent editor={editor} />;
  }
);

SceneEditor.displayName = "SceneEditor";

export default SceneEditor;