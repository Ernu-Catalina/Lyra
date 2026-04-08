import * as React from "react";
import type { Editor } from "@tiptap/react";

const headingStyles = [
  {
    label: "Normal",
    value: "paragraph",
    style: {
      fontSize: "15px",
      fontWeight: 400,
      margin: 0,
      letterSpacing: 0,
      lineHeight: 1.15,
    },
  },
  {
    label: "Heading 1",
    value: "1",
    style: {
      fontSize: "28px",
      fontWeight: 700,
      margin: 0,
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
    },
  },
  {
    label: "Heading 2",
    value: "2",
    style: {
      fontSize: "22px",
      fontWeight: 600,
      margin: 0,
      letterSpacing: "-0.01em",
      lineHeight: 1.25,
    },
  },
  {
    label: "Heading 3",
    value: "3",
    style: {
      fontSize: "18px",
      fontWeight: 500,
      margin: 0,
      letterSpacing: 0,
      lineHeight: 1.3,
    },
  },
  {
    label: "Heading 4",
    value: "4",
    style: {
      fontSize: "16px",
      fontWeight: 500,
      margin: 0,
      letterSpacing: 0,
      lineHeight: 1.3,
    },
  },
];

interface HeadingSelectorProps {
  editor: Editor;
}

export function HeadingSelector({ editor }: HeadingSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState("paragraph");
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Update current heading when editor state changes
  React.useEffect(() => {
    const handleSelectionUpdate = () => {
      let headingLevel = "paragraph";
      for (let i = 1; i <= 4; i++) {
        if (editor.isActive("heading", { level: i })) {
          headingLevel = String(i);
          break;
        }
      }
      setCurrent(headingLevel);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("update", handleSelectionUpdate);

    // Initial check
    handleSelectionUpdate();

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("update", handleSelectionUpdate);
    };
  }, [editor]);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const mainLabel = headingStyles.find(h => h.value === current)?.label || "Normal";
  const mainStyle = headingStyles.find(h => h.value === current)?.style || headingStyles[0].style;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        className="px-3 py-1.5 bg-[--bg-primary] hover:bg-[--bg-secondary] border border-[--border] rounded text-sm min-w-[140px] flex items-center justify-between transition-colors"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        type="button"
        title="Heading style"
      >
        <span style={mainStyle}>{mainLabel}</span>
        <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 z-50 bg-white border border-[--border] rounded shadow-lg min-w-[200px] mt-1 overflow-hidden">
          {headingStyles.map(h => (
            <div
              key={h.value}
              className={`px-4 py-2 cursor-pointer hover:bg-[--bg-primary] transition-colors ${current === h.value ? "bg-blue-100 text-blue-900" : ""}`}
              style={h.style}
              role="option"
              aria-selected={current === h.value}
              tabIndex={-1}
              onMouseDown={e => {
                e.preventDefault();
                setOpen(false);
                if (h.value === "paragraph") {
                  editor.chain().focus().setParagraph().run();
                } else {
                  const level = Number(h.value) as 1 | 2 | 3 | 4;
                  editor.chain().focus().setHeading({ level }).run();
                }
              }}
            >
              {h.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}