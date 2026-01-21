// components/molecules/MenuItem.tsx
import type { ReactNode } from "react";
import styles from "./MenuItem.module.css";

interface MenuItemProps {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: MenuItemProps) {
  return (
    <button
      className={`${styles.item} ${danger ? styles.danger : ""} ${
        disabled ? styles.disabled : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}