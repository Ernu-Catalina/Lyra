import type { ChangeEvent } from "react";
import styles from "./HeadingSelector.module.css";

interface HeadingSelectorProps {
  value: string;
  onChange: (level: string) => void;
}

export function HeadingSelector({ value, onChange }: HeadingSelectorProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className={styles.select}
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