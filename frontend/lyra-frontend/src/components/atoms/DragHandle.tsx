import styles from "./DragHandle.module.css";

export function DragHandle() {
  return (
    <div className={styles.handle} aria-hidden="true">
      ⋮⋮
    </div>
  );
}