import React from "react";

interface WordCountDisplayProps {
  text: string | null;
}

/**
 * Renders a centered word count display.
 * Accepts the formatted word count text and displays it in the center of its allocated space.
 */
export function WordCountDisplay({ text }: WordCountDisplayProps) {
  if (!text) return null;

  return (
    <div className="text-center text-sm text-[var(--text-secondary)]">
      {text}
    </div>
  );
}
