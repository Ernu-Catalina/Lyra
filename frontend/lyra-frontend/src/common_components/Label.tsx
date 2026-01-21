import type { LabelHTMLAttributes } from "react";
import styles from "./Label.module.css";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, required, className, ...props }: LabelProps) {
  return (
    <label className={`${styles.label} ${className || ""}`} {...props}>
      {children}
      {required && <span className={styles.required}>*</span>}
    </label>
  );
}