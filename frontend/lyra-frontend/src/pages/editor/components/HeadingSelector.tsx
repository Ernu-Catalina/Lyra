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
      fontSize: "1.75rem", // ~28px
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
      fontSize: "1.375rem", // ~22px
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
      fontSize: "1.125rem", // ~18px
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
      fontSize: "1rem", // ~16px
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
  // Determine current heading
  let current = "paragraph";
  for (let i = 1; i <= 4; i++) {
    if (editor.isActive("heading", { level: i })) {
      current = String(i);
      break;
    }
  }

  // Show dropdown on click/focus
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!buttonRef.current) return;
      if (!buttonRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm min-w-[140px] flex items-center justify-between"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        type="button"
      >
        {headingStyles.map(h =>
          h.value === current ? (
            <span key={h.value} style={h.style}>{h.label}</span>
          ) : null
        )}
        <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 z-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow min-w-[180px] mt-1">
          {headingStyles.map(h => (
            <div
              key={h.value}
              className={`px-4 py-1.5 cursor-pointer hover:bg-[var(--bg-primary)] ${current === h.value ? "bg-[var(--bg-primary)]" : ""}`}
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
                  editor.chain().focus().setHeading({ level: Number(h.value) as 1 | 2 | 3 | 4 }).run();
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