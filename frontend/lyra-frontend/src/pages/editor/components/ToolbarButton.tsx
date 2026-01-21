import { Button, type ButtonProps } from "../../../common_components/Button";
import styles from "./ToolbarButton.module.css";

interface ToolbarButtonProps extends ButtonProps {
  active?: boolean;
}

export function ToolbarButton({
  children,
  active = false,
  ...props
}: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`${styles.toolbarButton} ${active ? styles.active : ""}`}
      {...props}
    >
      {children}
    </Button>
  );
}