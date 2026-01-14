// src/components/atoms/AutosaveStatus.tsx
import styles from "./AutosaveStatus.module.css";

interface Props {
  status: "saved" | "saving" | "error";
}

export function AutosaveStatus({ status }: Props) {
  return (
    <span className={`${styles.status} ${styles[status]}`}>
      {status === "saving" && "Saving..."}
      {status === "saved" && "Saved"}
      {status === "error" && "Save failed"}
    </span>
  );
}