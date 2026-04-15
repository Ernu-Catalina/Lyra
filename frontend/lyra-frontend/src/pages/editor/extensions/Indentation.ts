import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indentation: {
      /**
       * Increase the indentation of the current selection
       */
      sinkIndent: () => ReturnType;
      /**
       * Decrease the indentation of the current selection
       */
      liftIndent: () => ReturnType;
    };
  }
}

export const Indentation = Extension.create({
  name: "indentation",

  addOptions() {
    return {
      types: ["paragraph"],
      indentLevels: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      defaultIndentLevel: 0,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: this.options.defaultIndentLevel,
            parseHTML: (element) => {
              const textIndent = element.style.textIndent;
              if (textIndent) {
                const level = parseFloat(textIndent.replace("em", ""));
                return isNaN(level) ? this.options.defaultIndentLevel : level;
              }
              return this.options.defaultIndentLevel;
            },
            renderHTML: (attributes) => {
              if (attributes.indent && attributes.indent > 0) {
                return {
                  style: `text-indent: ${attributes.indent * 1.5}em;`,
                };
              }
              return {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const setIndent = (direction: 1 | -1) =>
      ({ state, dispatch }: { state: any; dispatch: any }) => {
        const { from, to } = state.selection;
        const tr = state.tr;
        let updated = false;

        state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (this.options.types.includes(node.type.name)) {
            const currentIndent = node.attrs.indent ?? 0;
            const levels = this.options.indentLevels;
            const newIndent = Math.min(
              Math.max(currentIndent + direction, Math.min(...levels)),
              Math.max(...levels)
            );
            if (newIndent !== currentIndent) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: newIndent,
              });
              updated = true;
            }
          }
        });

        if (updated && dispatch) {
          dispatch(tr);
        }
        return updated;
      };

    return {
      sinkIndent: () => setIndent(1),
      liftIndent: () => setIndent(-1),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.sinkIndent(),
      "Shift-Tab": () => this.editor.commands.liftIndent(),
    };
  },
});