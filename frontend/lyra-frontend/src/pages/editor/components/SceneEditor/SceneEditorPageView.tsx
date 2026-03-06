import type { ReactNode } from "react";

interface SceneEditorPageViewProps {
  children: ReactNode;
}

export function SceneEditorPageView({ children }: SceneEditorPageViewProps) {
  return (
    <div className="h-full bg-[var(--bg-primary)] p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] shadow-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
}