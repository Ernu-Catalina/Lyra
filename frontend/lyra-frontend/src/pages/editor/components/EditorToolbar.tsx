
import { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { HeadingSelector } from "./HeadingSelector";
import { AlignmentGroup } from "./AlignmentGroup";
import { DocumentSettingsModal } from "./DocumentSettingsModal";
import { Bold, Italic, Underline, Strikethrough, Indent, Outdent, Settings, Paintbrush } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";

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
const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72];
const LINE_HEIGHTS = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" },
];

const PX_TO_PT = 0.75; // 1px = 0.75pt at 96dpi
const PT_TO_PX = 1.333;

interface EditorToolbarProps {
  editor: Editor | null;
  onSettingsApplied?: () => void;
}

export function EditorToolbar({ editor, onSettingsApplied }: EditorToolbarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [fontDropdown, setFontDropdown] = useState(false);
  const [fontSizeDropdown, setFontSizeDropdown] = useState(false);
  const [lineDropdown, setLineDropdown] = useState(false);
  const [inputFontSize, setInputFontSize] = useState("");
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [copiedFormatting, setCopiedFormatting] = useState<any>(null);

  const fontSizeInputRef = useRef<HTMLInputElement>(null);
  const fontSizeContainerRef = useRef<HTMLDivElement>(null);
  const fontFamilyContainerRef = useRef<HTMLDivElement>(null);
  const lineHeightContainerRef = useRef<HTMLDivElement>(null);

  // Helper to get current node attributes (heading or paragraph)
  const getCurrentNodeAttrs = () => {
    if (!editor) return {};
    const state = editor.state;
    const { from, to } = state.selection;
    let node = null;
    state.doc.nodesBetween(from, to, (n) => {
      if (n.type.name === "heading" || n.type.name === "paragraph") {
        node = n;
        return false;
      }
    });
    return node ? node.attrs : {};
  };

  // Font helpers
  const getFontFamily = () => {
    if (!editor) return "";
    const attrs = editor.getAttributes("textStyle");
    return attrs.fontFamily || getCurrentNodeAttrs().fontFamily || "";
  };

const getFontSize = (): number => {
    if (!editor) return 12;
    const attrs = editor.getAttributes("textStyle");
    const raw: string = attrs.fontSize || "";

    if (!raw) {

      const el = document.querySelector<HTMLElement>(".page-container");
      if (el) {
        const computed = window.getComputedStyle(el).fontSize; // returns px
        const px = parseFloat(computed);
        return Math.round(px * PX_TO_PT); // convert to pt
      }
      return 12;
    }

    if (raw.endsWith("pt")) {
      return Math.round(parseFloat(raw));
    }
    if (raw.endsWith("px")) {
      // Legacy px value — convert to pt for display
      return Math.round(parseFloat(raw) * PX_TO_PT);
    }
    return Math.round(parseFloat(raw));
  };


  const getLineHeight = () => {
    if (!editor) return "1.15";
    const { from } = editor.state.selection;
    let lh = "1.15";
    editor.state.doc.nodesBetween(from, from, (node) => {
      if (
        node.type.name === "paragraph" ||
        node.type.name === "heading"
      ) {
        lh = node.attrs.lineHeight || "1.15";
        return false;
      }
    });
    return lh;
  };

    const currentFont = editor
    ? FONT_FAMILIES.find((f) => f.value === getFontFamily()) || FONT_FAMILIES[0]
    : FONT_FAMILIES[0];
  const currentFontSize = getFontSize();
  const currentLineHeight = getLineHeight();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontSizeContainerRef.current && !fontSizeContainerRef.current.contains(e.target as Node)) {
        setFontSizeDropdown(false);
      }
      if (fontFamilyContainerRef.current && !fontFamilyContainerRef.current.contains(e.target as Node)) {
        setFontDropdown(false);
      }
      if (lineHeightContainerRef.current && !lineHeightContainerRef.current.contains(e.target as Node)) {
        setLineDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update input when selection changes
  useEffect(() => {
    setInputFontSize(String(currentFontSize));
  }, [currentFontSize]);

  const handleIncreaseFont = () => {
    if (!editor) return;
    const newSize = Math.min(72, currentFontSize + 1);
    editor.chain().focus().setMark("textStyle", { fontSize: `${newSize}pt` }).run();
  };

  const handleDecreaseFont = () => {
    if (!editor) return;
    const newSize = Math.max(6, currentFontSize - 1);
    editor.chain().focus().setMark("textStyle", { fontSize: `${newSize}pt` }).run();
  };

  const handleFontSizeChange = (value: string) => {
    if (!editor) return;
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 6 && num <= 72) {
      setInputFontSize(value);
      editor.chain().focus().setMark("textStyle", { fontSize: `${num}pt` }).run();
    } else if (value === "") {
      setInputFontSize(value);
    }
  };

  const handleFontSizeSelect = (size: number) => {
    if (!editor) return;
    setInputFontSize(String(size));
    editor.chain().focus().setMark("textStyle", { fontSize: `${size}pt` }).run();
    setFontSizeDropdown(false);
  };

const handleLineHeightSelect = (value: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const tr = editor.state.tr;
    let changed = false;

    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      if (
        node.type.name === "paragraph" ||
        node.type.name === "heading"
      ) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          lineHeight: value,
        });
        changed = true;
      }
    });

    if (changed) editor.view.dispatch(tr);
    setLineDropdown(false);
  };

  const handleFormatPainterClick = () => {
    if (!editor) return;
    if (formatPainterActive) {
      // If already active, deactivate
      setFormatPainterActive(false);
      setCopiedFormatting(null);
      editor.commands.blur();
    } else {
      // Copy current formatting
      const attrs = editor.getAttributes("textStyle");
      const currentFormatting = {
        fontFamily: attrs.fontFamily || getCurrentNodeAttrs().fontFamily,
        fontSize: attrs.fontSize || getCurrentNodeAttrs().fontSize,
        fontWeight: attrs.fontWeight || getCurrentNodeAttrs().fontWeight,
        fontStyle: attrs.fontStyle || getCurrentNodeAttrs().fontStyle,
        textDecoration: attrs.textDecoration || getCurrentNodeAttrs().textDecoration,
        textAlign: editor.getAttributes("textAlign").textAlign || getCurrentNodeAttrs().textAlign,
        lineHeight: attrs.lineHeight || getCurrentNodeAttrs().lineHeight,
      };
      setCopiedFormatting(currentFormatting);
      setFormatPainterActive(true);
    }
  };

  const applyCopiedFormatting = () => {
    if (!copiedFormatting || !formatPainterActive || !editor) return;

    const chain = editor.chain().focus().setMark("textStyle", {
      fontFamily: copiedFormatting.fontFamily,
      fontSize: copiedFormatting.fontSize,
      fontWeight: copiedFormatting.fontWeight,
      fontStyle: copiedFormatting.fontStyle,
      textDecoration: copiedFormatting.textDecoration,
      lineHeight: copiedFormatting.lineHeight,
    });

    if (copiedFormatting.textAlign) {
      chain.setTextAlign(copiedFormatting.textAlign);
    }

    chain.run();

    setFormatPainterActive(false);
    setCopiedFormatting(null);
  };

  // Handle format painter application on text selection via mouseup
  useEffect(() => {
    if (!formatPainterActive || !editor) return;

    const editorEl = editor.view.dom;

    const handleMouseUp = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        // Only apply if user has actually selected text
        applyCopiedFormatting();
      }
    };

    editorEl.addEventListener("mouseup", handleMouseUp);
    return () => editorEl.removeEventListener("mouseup", handleMouseUp);
  }, [editor, formatPainterActive, copiedFormatting]);

  return (
    <div className="flex items-center gap-1.5 flex-wrap bg-[var(--bg-secondary)] px-3 py-2 border-[var(--border)]">
      {editor && (
        <>
          {/* Headings */}
          <HeadingSelector editor={editor} />

          <div className="h-5 w-px bg-[var(--border)] mx-1" />

          {/* Basic formatting */}
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            active={editor.isActive("bold")} 
            title="Bold (Ctrl+B)"
          >
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            active={editor.isActive("italic")} 
            title="Italic (Ctrl+I)"
          >
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            active={editor.isActive("underline")} 
            title="Underline (Ctrl+U)"
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

          {/* Format Painter */}
          <ToolbarButton 
            onClick={handleFormatPainterClick} 
            active={formatPainterActive}
            title={formatPainterActive ? "Click to apply copied formatting" : "Format Painter - Copy formatting"}
          >
            <Paintbrush size={18} />
          </ToolbarButton>

          <div className="relative" ref={fontFamilyContainerRef}>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm min-w-36 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] transition-colors"
              type="button"
          onClick={() => setFontDropdown((f) => !f)}
          style={{ fontFamily: currentFont.value || undefined }}
        >
          <span style={{ fontFamily: currentFont.value || undefined }} className="flex-1 text-left">
            {currentFont.label}
          </span>
          <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {fontDropdown && (
          <div className="absolute left-0 z-50 mt-1 bg-white border border-[var(--border)] rounded shadow-lg min-w-40 max-h-64 overflow-y-auto">
            {FONT_FAMILIES.map((f) => (
              <div
                key={f.value}
                className={`px-4 py-2 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors ${
                  getFontFamily() === f.value ? "bg-blue-100 text-blue-900" : ""
                }`}
                style={{ fontFamily: f.value || undefined }}
                onMouseDown={(e) => {
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

      {/* Font size with number input and +/- buttons */}
      <div className="relative flex items-center" ref={fontSizeContainerRef}>
        <button
          className="px-2 py-1.5 rounded-l text-sm bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-r-0 border-[var(--border)] transition-colors font-medium"
          type="button"
          onClick={handleDecreaseFont}
          title="Decrease font size"
        >
          −
        </button>
        <input
          ref={fontSizeInputRef}
          className="w-12 py-1.5 text-center border-y border-[var(--border)] text-sm font-medium text-[var(--text-primary)] focus:outline-none"
          type="number"
          min={8}
          max={72}
          value={inputFontSize}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          onFocus={() => setFontSizeDropdown(true)}
        />
        <button
          className="px-2 py-1.5 rounded-r text-sm bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-l-0 border-[var(--border)] transition-colors font-medium"
          type="button"
          onClick={handleIncreaseFont}
          title="Increase font size"
        >
          +
        </button>
        {fontSizeDropdown && (
          <div className="absolute left-0 top-full z-50 mt-1 bg-white border border-[var(--border)] rounded shadow-lg min-w-24 max-h-64 overflow-y-auto">
            {FONT_SIZE_OPTIONS.map((size) => (
              <div
                key={size}
                className={`px-4 py-2 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors text-sm ${
                  currentFontSize === size ? "bg-blue-100 text-blue-900 font-semibold" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFontSizeSelect(size);
                }}
              >
                {size}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Line spacing dropdown */}
      <div className="relative" ref={lineHeightContainerRef}>
        <button
          className="flex items-center justify-center py-1.5 px-1.5 rounded text-sm bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] transition-colors"
          type="button"
          onClick={() => setLineDropdown((l) => !l)}
          title="Line spacing"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h8" />
            <path d="M8 12h8" />
            <path d="M8 18h8" />
            <path d="M3 6v12" />
            <path d="M3 9h2" />
            <path d="M3 15h2" />
          </svg>
        </button>
        {lineDropdown && (
          <div className="absolute left-0 top-full z-50 mt-1 bg-white border border-[var(--border)] rounded shadow-lg min-w-28 overflow-hidden">
            {LINE_HEIGHTS.map((lh) => (
              <div
                key={lh.value}
                className={`px-4 py-2 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors text-sm ${
                  String(currentLineHeight) === String(lh.value) ? "bg-blue-100 text-blue-900 font-semibold" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleLineHeightSelect(lh.value);
                }}
              >
                {lh.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-[var(--border)] mx-1" />

      {/* Indent/Outdent */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().sinkIndent().run()} 
        title="Increase indent (Tab)"
      >
        <Indent size={18} />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().liftIndent().run()} 
        title="Decrease indent (Shift+Tab)"
      >
        <Outdent size={18} />
      </ToolbarButton>

      <div className="h-5 w-px bg-[var(--border)] mx-1" />

      {/* Alignment */}
      <AlignmentGroup editor={editor} />
        </>
      )}

      <div className="flex-1" />

      {/* Document Settings */}
      <button
        className="text-right rounded text-sm hover:bg-[var(--bg-secondary)] transition-colors"
        type="button"
        onClick={() => setShowSettings(true)}
        title="Document settings"
      >
        <Settings size={18} />
      </button>

      {showSettings && <DocumentSettingsModal editor={editor} onClose={() => setShowSettings(false)} onSettingsApplied={onSettingsApplied} />}
    </div>
  );
}
