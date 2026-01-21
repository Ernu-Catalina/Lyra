import styles from "./WordCountBadge.module.css";

interface WordCountBadgeProps {
  count: number;
  label?: string;
}

export function WordCountBadge({ count, label = "words" }: WordCountBadgeProps) {
  return (
    <span className={styles.badge}>
      {count} {label}
    </span>
  );
}