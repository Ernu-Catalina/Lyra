
import { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { HeadingSelector } from "./HeadingSelector";
import { AlignmentGroup } from "./AlignmentGroup";
import { Bold, Italic, Underline, Strikethrough, Indent, Outdent } from "lucide-react";
import React from "react";


const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Calibri", value: "Calibri, Candara, Segoe, Segoe UI, Optima, Arial, sans-serif" },
  { label: "Default", value: "" },
];
const FONT_SIZE_OPTIONS = [8,9,10,11,12,14,16,18,20,22,24,28,32,36,40,48,56,64,72];
const LINE_HEIGHTS = [1, 1.15, 1.5, 2, 2.5, 3];



interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  // Helper to get current node attributes (heading or paragraph)
  const getCurrentNodeAttrs = () => {
    const state = editor.state;
    const { from, to } = state.selection;
    let node = null;
    state.doc.nodesBetween(from, to, n => {
      if (n.type.name === "heading" || n.type.name === "paragraph") {
        node = n;
        return false;
      }
      return;
    });
    return node ? node.attrs : {};
  };


  // Font helpers
  const getFontFamily = () => editor.getAttributes("textStyle").fontFamily || getCurrentNodeAttrs().fontFamily || "";
  const getFontSize = () => {
    const size = editor.getAttributes("textStyle").fontSize || getCurrentNodeAttrs().fontSize || "";
    return size.replace("px", "");
  };
  // Line height (not implemented in this version, but placeholder for future)
  // const getLineHeight = () => editor.getAttributes("textStyle").lineHeight || getCurrentNodeAttrs().lineHeight || "";

  // Font size state for dropdown
  const [fontSizeDropdown, setFontSizeDropdown] = React.useState(false);

  // Font family dropdown
  const [fontDropdown, setFontDropdown] = React.useState(false);

  // Line spacing dropdown
  const [lineDropdown, setLineDropdown] = React.useState(false);
  const currentLineHeight = editor.getAttributes("textStyle").lineHeight || getCurrentNodeAttrs().lineHeight || "1.15";

  // Font family button
  const currentFont = FONT_FAMILIES.find(f => f.value === getFontFamily()) || FONT_FAMILIES[0];

  return (
    <div className="flex items-center gap-1.5 flex-wrap bg-[--bg-secondary] px-2 py-1  border-[--border]">
      {/* Font family dropdown with live preview */}
      <div className="relative">
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-sm min-w-30"
          type="button"
          onClick={() => setFontDropdown(f => !f)}
          style={{ fontFamily: currentFont.value || undefined }}
        >
          <span className="material-icons" style={{ fontSize: 14 }}></span>
          <span style={{ fontFamily: currentFont.value || undefined }}>{currentFont.label}</span>
        </button>
        {fontDropdown && (
          <div className="absolute left-0 z-10 mt-1 bg-white border rounded shadow min-w-36 max-h-64 overflow-auto">
            {FONT_FAMILIES.map(f => (
              <div
                key={f.value}
                className={`px-4 py-1.5 cursor-pointer hover:bg-[--bg-primary] ${getFontFamily() === f.value ? "bg-[--bg-primary]" : ""}`}
                style={{ fontFamily: f.value || undefined }}
                onMouseDown={e => {
                  e.preventDefault();
                  setFontDropdown(false);
                  editor.chain().focus().setFontFamily(f.value).run();
                }}
              >
                {f.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Font size input with +/- and dropdown */}
      <div className="relative flex items-center">
        <button
          className="px-3 "
          type="button"
          onClick={() => {
            let size = parseInt(getFontSize() || "12", 10);
            size = Math.max(8, size - 1);
            editor.chain().focus().setMark('textStyle', { fontSize: size + 'px' }).run();
          }}
        >-</button>
        <input
          className="w-10 text-center border "
          type="number"
          min={8}
          max={72}
          value={getFontSize() || 12}
          onChange={e => {
            let val = Math.max(8, Math.min(72, Number(e.target.value)));
            editor.chain().focus().setMark('textStyle', { fontSize: val + 'px' }).run();
          }}
          onFocus={() => setFontSizeDropdown(true)}
        />
        <button
          className="px-3"
          type="button"
          onClick={() => {
            let size = parseInt(getFontSize() || "12", 10);
            size = Math.min(72, size + 1);
            editor.chain().focus().setMark('textStyle', { fontSize: size + 'px' }).run();
          }}
        >+</button>
        {fontSizeDropdown && (
          <div className="absolute left-0 z-10 mt-1 bg-white border rounded shadow min-w-36 max-h-64 overflow-auto">
            {FONT_SIZE_OPTIONS.map(size => (
              <div
                key={size}
                className="px-4 py-1.5 cursor-pointer hover:bg-[--bg-primary]"
                onMouseDown={e => {
                  e.preventDefault();
                  setFontSizeDropdown(false);
                  editor.chain().focus().setMark('textStyle', { fontSize: size + 'px' }).run();
                }}
              >
                {size}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Line spacing button with dropdown */}
      <div className="relative">
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-sm min-w-9"
          type="button"
          onClick={() => setLineDropdown(l => !l)}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M7 4h6M7 8h6M7 12h6M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        {lineDropdown && (
          <div className="absolute left-0 z-10 mt-1 bg-white border rounded shadow min-w-24">
            {LINE_HEIGHTS.map(lh => (
              <div
                key={lh}
                className={`px-4 py-1.5 cursor-pointer hover:bg-[--bg-primary] ${String(currentLineHeight) === String(lh) ? "bg-[--bg-primary]" : ""}`}
                onMouseDown={e => {
                  e.preventDefault();
                  setLineDropdown(false);
                  editor.chain().focus().setMark('textStyle', { lineHeight: String(lh) }).run();
                }}
              >
                {lh}
              </div>
            ))}
          </div>
        )}
      </div>

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

      <div className="h-5 w-px bg-[--border] mx-1" />

      {/* Headings with live preview */}
      <HeadingSelector editor={editor} />

      <div className="h-5 w-px bg-[--border] mx-1" />

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

      <div className="h-5 w-px bg-[--border] mx-1" />

      <AlignmentGroup editor={editor} />
    </div>
  );
}
