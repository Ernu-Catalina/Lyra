import { Button, type ButtonProps } from "../../../common_components/Button";

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
      {...props}
    >
      {children}
    </Button>
  );
}