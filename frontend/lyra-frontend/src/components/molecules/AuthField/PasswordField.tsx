import { Input } from "../../atoms/Input";
import { Label } from "../../atoms/Label";
import { ErrorMessage } from "../../atoms/ErrorMessage";
import styles from "./AuthField.module.css";

interface PasswordFieldProps {
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
}: PasswordFieldProps) {
  return (
    <div className={styles.field}>
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        error={!!error}
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}