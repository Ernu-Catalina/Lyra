// features/auth/components/CodeInput.tsx
import { useRef, useEffect, ClipboardEvent, KeyboardEvent } from "react";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
}

export default function CodeInput({
  value,
  onChange,
  length = 6,
  label = "Code",
}: CodeInputProps) {
  const inputs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 1);
    if (val) {
      const valueArray = value.split('').concat(Array(length - value.length).fill(''));
      valueArray[index] = val;
      const newValue = valueArray.slice(0, length).join('');
      onChange(newValue);

      if (index < length - 1) {
        inputs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length - index);
    if (paste) {
      const newValue = value.slice(0, index) + paste + value.slice(index + paste.length);
      onChange(newValue.slice(0, length));

      const nextFocus = Math.min(index + paste.length, length - 1);
      inputs.current[nextFocus]?.focus();
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">{label}</label>
      )}
      <div className="flex gap-3 justify-center">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(e, i)}
            ref={(el) => {
              if (el) inputs.current[i] = el;
            }}
            className="
              w-12 h-12 text-center text-2xl font-bold bg-gray-800 
              border border-gray-700 rounded-lg text-white 
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              transition
            "
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        ))}
      </div>
    </div>
  );
}