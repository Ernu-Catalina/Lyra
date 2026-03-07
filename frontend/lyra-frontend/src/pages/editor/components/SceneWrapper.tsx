// src/pages/editor/components/SceneWrapper.tsx
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

interface SceneWrapperProps {
  node: any;
  updateAttributes: (attrs: any) => void;
}

export default function SceneWrapper({ node, updateAttributes }: SceneWrapperProps) {
  const { id, title } = node.attrs;

  return (
    <NodeViewWrapper className="scene-block border-l-4 border-[var(--accent)] pl-4 my-4 bg-[var(--bg-secondary)]/50 rounded">
      <div className="text-sm font-medium text-[var(--accent)] mb-2">
        Scene: {title} (ID: {id.slice(0, 8)}...)
      </div>
      <NodeViewContent className="min-h-[2rem]" />
    </NodeViewWrapper>
  );
}