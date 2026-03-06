import { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";

interface AlignmentGroupProps {
  editor: Editor | null;
}

export function AlignmentGroup({ editor }: AlignmentGroupProps) {
  if (!editor) return null;

  const alignments = [
    { align: "left", Icon: AlignLeft, label: "Align left" },
    { align: "center", Icon: AlignCenter, label: "Align center" },
    { align: "right", Icon: AlignRight, label: "Align right" },
    { align: "justify", Icon: AlignJustify, label: "Justify" },
  ];

  return (
    <div className="flex items-center gap-1">
      {alignments.map(({ align, Icon, label }) => (
        <ToolbarButton
          key={align}
          onClick={() => editor.chain().focus().setTextAlign(align).run()}
          active={editor.isActive({ textAlign: align })}
          title={label}
        >
          <Icon size={18} />
        </ToolbarButton>
      ))}
    </div>
  );
}