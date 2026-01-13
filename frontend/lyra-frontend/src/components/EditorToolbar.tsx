import { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="editor-toolbar">
      <button onClick={() => editor.chain().focus().toggleBold().run()}>
        Bold
      </button>

      <button onClick={() => editor.chain().focus().toggleItalic().run()}>
        Italic
      </button>

      <label htmlFor="heading-select" className="sr-only">
        Text style
      </label>
      
      <select
        id="heading-select"
        aria-label="Text style"
        onChange={(e) => {
          const value = e.target.value;
          if (value === "paragraph") {
            editor.chain().focus().setParagraph().run();
          } else {
            editor.chain().focus().toggleHeading({ level: Number(value) as 1 | 2 | 3 | 4 }).run();
          }
        }}
      >
        <option value="paragraph">Normal Text</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
      </select>
    
      <button onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        Left
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        Center
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        Right
      </button>
    </div>
  );
}
