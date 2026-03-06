import { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { HeadingSelector } from "./HeadingSelector";
import { AlignmentGroup } from "./AlignmentGroup";
import { Bold, Italic } from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap p-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold size={18} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic size={18} />
      </ToolbarButton>

      <div className="h-5 w-px bg-[var(--border)] mx-1" />

      <HeadingSelector
        value={
          editor.isActive("heading", { level: 1 }) ? "1" :
          editor.isActive("heading", { level: 2 }) ? "2" :
          editor.isActive("heading", { level: 3 }) ? "3" :
          editor.isActive("heading", { level: 4 }) ? "4" : "paragraph"
        }
        onChange={(level) => {
          editor.chain().focus().run(); // ensure focus
          if (level === "paragraph") {
            editor.commands.setParagraph();
          } else {
            editor.commands.toggleHeading({ level: Number(level) as 1 | 2 | 3 | 4 });
          }
        }}
      />

      <div className="h-5 w-px bg-[var(--border)] mx-1" />

      <AlignmentGroup editor={editor} />
    </div>
  );
}