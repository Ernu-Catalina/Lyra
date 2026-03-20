// src/pages/editor/extensions/PreserveDataAttributes.ts
import { Extension } from '@tiptap/core';

export const PreserveDataAttributes = Extension.create({
  name: 'preserveDataAttributes',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'div', 'scene'], // include your custom node if used
        attributes: {
          // Preserve any data-* attribute
          dataSceneId: {
            default: null,
            parseHTML: element => element.getAttribute('data-scene-id'),
            renderHTML: attributes => {
              if (!attributes.dataSceneId) return {};
              return { 'data-scene-id': attributes.dataSceneId };
            },
          },
          dataSceneTitle: {
            default: null,
            parseHTML: element => element.getAttribute('data-scene-title'),
            renderHTML: attributes => {
              if (!attributes.dataSceneTitle) return {};
              return { 'data-scene-title': attributes.dataSceneTitle };
            },
          },
        },
      },
    ];
  },
});