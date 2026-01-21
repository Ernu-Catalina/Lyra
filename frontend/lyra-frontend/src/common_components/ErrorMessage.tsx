import type { ReactNode } from "react";
import styles from "./ErrorMessage.module.css";

interface ErrorMessageProps {
  children: ReactNode;
}

export function ErrorMessage({ children }: ErrorMessageProps) {
  if (!children) return null;
  return <p className={styles.error}>{children}</p>;
}