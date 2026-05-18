import { Extension } from '@tiptap/core';

export interface FontSizeOptions {
  types: string[];
}

/**
 * FontSize Extension
 * 
 * Allows inline font-size marks on text selections via toolbar.
 * When document settings are applied via "Apply to Entire Document":
 * 1. All inline font-size marks are removed by resetAllTextFormatting()
 * 2. CSS !important rules force document settings to override any remaining inline styles
 * 3. The page container sets font-size with !important priority
 * 
 * This design allows both manual per-paragraph font tweaks AND proper document-wide settings precedence.
 */
export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};   // let container styles win when no explicit size is set
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

