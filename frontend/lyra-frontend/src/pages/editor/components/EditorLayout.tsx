// src/components/templates/EditorLayout.tsx
import type { ReactNode } from "react";

interface EditorLayoutProps {
  sidebar: ReactNode;
  toolbar?: ReactNode;
  editor: ReactNode;
  footer?: ReactNode;
}

export function EditorLayout({
  sidebar,
  toolbar,
  editor,
  footer,
}: EditorLayoutProps) {
  return (
    <div>
      {sidebar}

      <div>
        {toolbar && <div>{toolbar}</div>}

        <main>
          {editor}
        </main>

        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}