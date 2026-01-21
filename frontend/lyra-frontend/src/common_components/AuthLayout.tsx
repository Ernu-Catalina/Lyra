// common_components/AuthLayout.tsx
import type { ReactNode } from "react";
import styles from "./AuthLayout.module.css";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </div>
    </div>
  );
}