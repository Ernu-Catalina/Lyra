import type { ChangeEvent } from "react";

interface HeadingSelectorProps {
  value: string;
  onChange: (level: string) => void;
}

export function HeadingSelector({ value, onChange }: HeadingSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className="
        px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)]
        rounded-md text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]
        outline-none min-w-[140px]
      "
      aria-label="Text style"
    >
      <option value="paragraph">Normal</option>
      <option value="1">Heading 1</option>
      <option value="2">Heading 2</option>
      <option value="3">Heading 3</option>
      <option value="4">Heading 4</option>
    </select>
  );
}