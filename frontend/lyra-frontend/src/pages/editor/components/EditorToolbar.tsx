// src/components/organisms/EditorToolbar.tsx
import { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { HeadingSelector } from "./HeadingSelector";
import { AlignmentGroup } from "./AlignmentGroup";
import styles from "./EditorToolbar.module.css";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className={styles.toolbar}>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        <em>I</em>
      </ToolbarButton>

      <HeadingSelector
        value={
          editor.isActive("heading", { level: 1 }) ? "1" :
          editor.isActive("heading", { level: 2 }) ? "2" :
          editor.isActive("heading", { level: 3 }) ? "3" :
          editor.isActive("heading", { level: 4 }) ? "4" : "paragraph"
        }
        onChange={(level) => {
          if (level === "paragraph") {
            editor.chain().focus().setParagraph().run();
          } else {
            editor.chain().focus().toggleHeading({ level: Number(level) as 1|2|3|4 }).run();
          }
        }}
      />

      <AlignmentGroup editor={editor} />
    </div>
  );
}