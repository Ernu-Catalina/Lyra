import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import { useEffect } from "react";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function SceneEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3, 4] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);


  return (
    <div className="editor-page">
      <EditorContent editor={editor} />
    </div>
  );
}
