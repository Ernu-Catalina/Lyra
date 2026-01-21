import { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";

interface AlignmentGroupProps {
  editor: Editor | null;
}

export function AlignmentGroup({ editor }: AlignmentGroupProps) {
  if (!editor) return null;

  const isLeft = editor.isActive({ textAlign: "left" });
  const isCenter = editor.isActive({ textAlign: "center" });
  const isRight = editor.isActive({ textAlign: "right" });

  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={isLeft}
        title="Align left"
      >
        ←
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={isCenter}
        title="Align center"
      >
        ↔
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={isRight}
        title="Align right"
      >
        →
      </ToolbarButton>
    </div>
  );
}