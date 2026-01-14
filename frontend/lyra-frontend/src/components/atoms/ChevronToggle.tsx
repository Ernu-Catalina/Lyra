import styles from "./ChevronToggle.module.css";

interface ChevronToggleProps {
  isOpen: boolean;
  onClick?: () => void;
}

export function ChevronToggle({ isOpen, onClick }: ChevronToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={styles.toggle}
      aria-label={isOpen ? "Collapse" : "Expand"}
    >
      {isOpen ? "▾" : "▸"}
    </button>
  );
}