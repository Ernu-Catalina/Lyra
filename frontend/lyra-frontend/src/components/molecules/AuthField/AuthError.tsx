// components/molecules/AuthField/AuthError.tsx
import styles from "./AuthError.module.css";

interface AuthErrorProps {
  message?: string;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;
  return <p className={styles.error}>{message}</p>;
}