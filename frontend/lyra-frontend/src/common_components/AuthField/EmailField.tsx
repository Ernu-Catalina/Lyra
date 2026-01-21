import { Input } from "../../atoms/Input";
import { Label } from "../../atoms/Label";
import { ErrorMessage } from "../../atoms/ErrorMessage";
import styles from "./AuthField.module.css";

interface EmailFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoFocus?: boolean;
}

export function EmailField({
  value,
  onChange,
  error,
  autoFocus,
}: EmailFieldProps) {
  return (
    <div className={styles.field}>
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        error={!!error}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}