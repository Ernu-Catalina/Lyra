// src/pages/editor/extensions/SceneNode.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SceneWrapper from '../components/SceneWrapper'; // we'll create this

export interface SceneNodeOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    scene: {
      setScene: (attrs?: { id: string; title?: string }) => ReturnType;
      toggleScene: () => ReturnType;
    };
  }
}

export const SceneNode = Node.create<SceneNodeOptions>({
  name: 'scene',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      title: {
        default: 'Untitled Scene',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="scene"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'scene' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SceneWrapper);
  },

  addCommands() {
    return {
      setScene:
        (attrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: [{ type: 'paragraph' }],
          });
        },
      toggleScene:
        () =>
        ({ commands, chain }) => {
          return chain().focus().toggleNode(this.name, 'paragraph').run();
        },
    };
  },
});