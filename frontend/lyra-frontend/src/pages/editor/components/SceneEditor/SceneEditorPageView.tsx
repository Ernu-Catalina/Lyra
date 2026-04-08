import type { ReactNode } from "react";

interface SceneEditorPageViewProps {
  children: ReactNode;
}

export function SceneEditorPageView({ children }: SceneEditorPageViewProps) {
  return (
    <div className="min-h-screen flex justify-center items-start bg-[var(--bg-primary)] py-8">
      <div className="bg-white w-full max-w-[800px] min-h-[1100px] rounded-lg shadow-xl border border-gray-200 p-6 md:p-8 lg:p-12 mx-4 md:mx-6 lg:mx-8 flex flex-col items-stretch">
        {children}
      </div>
    </div>
  );
}