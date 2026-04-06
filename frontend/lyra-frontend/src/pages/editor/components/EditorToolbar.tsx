import { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { HeadingSelector } from "./HeadingSelector";
import { AlignmentGroup } from "./AlignmentGroup";
import { Bold, Italic, Underline, Strikethrough, Indent, Outdent } from "lucide-react";
import React from "react";

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
];

const FONT_SIZES = [9, 10, 11, 12, 14, 16, 18, 24, 36];
const LINE_HEIGHTS = [1, 1.15, 1.5, 2];

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  // Get current font family and size from selection
  const getFontFamily = () => editor.getAttributes("textStyle").fontFamily || "";
  const getFontSize = () => editor.getAttributes("textStyle").fontSize || "";
  const getLineHeight = () => editor.getAttributes("textStyle").lineHeight || "";

  return (
    <div className="flex items-center gap-1.5 flex-wrap bg-[var(--bg-secondary)] px-2 py-1 border-b border-[var(--border)]">
      {/* Font family */}
      <select
        className="px-2 py-1 rounded border text-sm min-w-[120px]"
        value={getFontFamily()}
        onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
        title="Font family"
      >
        {FONT_FAMILIES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="px-2 py-1 rounded border text-sm min-w-[60px]"
        value={getFontSize()}
        onChange={e => editor.chain().focus().setFontSize(e.target.value + "px").run()}
        title="Font size"
      >
        {FONT_SIZES.map(size => (
          <option key={size} value={size + "px"}>{size}</option>
        ))}
      </select>

      {/* Line height */}
      <select
        className="px-2 py-1 rounded border text-sm min-w-[60px]"
        value={getLineHeight()}
        onChange={e => editor.chain().focus().setLineHeight(e.target.value).run()}
        title="Line spacing"
      >
        <option value="1">1.0</option>
        <option value="1.15">1.15</option>
        <option value="1.5">1.5</option>
        <option value="2">2.0</option>
      </select>

      {/* Indent/Outdent */}
      <ToolbarButton
        onClick={() => editor.chain().focus().sinkIndent().run()}
        title="Increase indent"
      >
        <Indent size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().liftIndent().run()}
        title="Decrease indent"
      >
        <Outdent size={18} />
      </ToolbarButton>

      <div className="h-5 w-px bg-[var(--border)] mx-1" />

      {/* Headings with live preview */}
      <HeadingSelector editor={editor} />

      <div className="h-5 w-px bg-[var(--border)] mx-1" />

      {/* Basic formatting */}
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
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
      >
        <Underline size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={18} />
      </ToolbarButton>

      <div className="h-5 w-px bg-[var(--border)] mx-1" />

      <AlignmentGroup editor={editor} />
    </div>
  );
}