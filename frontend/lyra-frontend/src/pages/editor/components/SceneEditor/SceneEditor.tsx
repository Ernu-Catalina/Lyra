//sceneEditor.tsx
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import {TextStyle} from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "../../extensions/FontSize";
import { Indentation } from "../../extensions/Indentation";

interface SceneEditorProps {
  content: string; // now always HTML string
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
        TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
        TextStyle,
        FontFamily,
        FontSize,
        Indentation,
      ],
      content,
      editable,
      editorProps: {
        attributes: {
          class: "prose prose-invert max-w-none focus:outline-none min-h-full",
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      parseOptions: {
        preserveWhitespace: "full",
      },
    });

    useImperativeHandle(ref, () => editor, [editor]);

    useEffect(() => {
      onEditorReady?.(editor);
    }, [editor, onEditorReady]);

    useEffect(() => {
      if (!editor) return;

      const currentHtml = editor.getHTML();

      if (content !== currentHtml) {
        editor.chain().setContent(content, false).run();
      }
    }, [content, editor]);

    if (!editor) return null;

    return (
      <div className="w-full h-full flex items-start justify-center bg-[var(--bg-primary)] py-8 overflow-y-auto">
        {/* A4 Page Container */}
        <div className="bg-white rounded-lg shadow-lg border border-[var(--border)]" style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "var(--margin-top, 20mm) var(--margin-right, 20mm) var(--margin-bottom, 20mm) var(--margin-left, 20mm)",
          margin: "0 auto",
        }}>
          <div className="bg-white w-full h-full text-[var(--text-primary)]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    );
  }
);

SceneEditor.displayName = "SceneEditor";

export default SceneEditor;