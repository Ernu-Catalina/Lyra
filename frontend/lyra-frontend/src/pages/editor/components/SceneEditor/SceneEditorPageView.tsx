// src/components/organisms/SceneEditor/SceneEditorPageView.tsx
import type { ReactNode } from "react";

interface SceneEditorPageViewProps {
  children: ReactNode;
}

export function SceneEditorPageView({ children }: SceneEditorPageViewProps) {
  return (
    <div>
      {children}
    </div>
  );
}