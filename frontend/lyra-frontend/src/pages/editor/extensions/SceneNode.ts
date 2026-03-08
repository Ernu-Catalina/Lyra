// src/pages/editor/extensions/SceneNode.ts
import { Node } from '@tiptap/core';

export const SceneNode = Node.create({
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
    return ['div', { 'data-type': 'scene', ...HTMLAttributes }, 0];
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
    };
  },
});