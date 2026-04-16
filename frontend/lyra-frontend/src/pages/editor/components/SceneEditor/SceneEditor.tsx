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
        StarterKit.configure({ 
          heading: false 
        }),
        HeadingWithSize.configure({ 
          levels: [1, 2, 3, 4],
        }),
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

    return <EditorContent editor={editor} />;
  }
);

SceneEditor.displayName = "SceneEditor";

export default SceneEditor;